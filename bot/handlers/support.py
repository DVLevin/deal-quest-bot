"""Handler for /support — deal analysis with strategist agent pipeline."""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot.agents.registry import AgentRegistry
from bot.pipeline.config_loader import load_pipeline
from bot.pipeline.context import PipelineContext
from bot.pipeline.runner import PipelineRunner
from bot.services.casebook import CasebookService
from bot.services.crypto import CryptoService
from bot.services.engagement import EngagementService
from bot.services.knowledge import KnowledgeService
from bot.services.llm_router import create_provider, web_research_call
from bot.services.progress import Phase, ProgressUpdater
from bot.services.transcription import TranscriptionService
from bot.tracing import TraceContext
from bot.states import SupportState
from bot.storage.insforge_client import InsForgeClient
from bot.storage.models import LeadRegistryModel, SupportSessionModel
from bot.storage.repositories import (
    LeadRegistryRepo,
    SupportSessionRepo,
    UserMemoryRepo,
    UserRepo,
)
from bot.utils import format_support_response
from bot.utils_tma import add_open_in_app_row
from bot.utils_validation import validate_user_input

logger = logging.getLogger(__name__)

router = Router(name="support")

def _support_actions_keyboard(lead_id: int | None = None) -> InlineKeyboardMarkup:
    """Build support actions keyboard, optionally including a lead link."""
    rows = [
        [
            InlineKeyboardButton(text="🔄 Regenerate", callback_data="support:regen"),
            InlineKeyboardButton(text="✂️ Shorter", callback_data="support:shorter"),
        ],
        [
            InlineKeyboardButton(text="🔥 More Aggressive", callback_data="support:aggressive"),
            InlineKeyboardButton(text="✅ Done", callback_data="support:done"),
        ],
    ]
    if lead_id:
        rows.append([
            InlineKeyboardButton(
                text="📋 View Lead & Plan", callback_data=f"lead:view:{lead_id}"
            ),
        ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


@router.message(Command("support"))
async def cmd_support(message: Message, state: FSMContext, user_repo: UserRepo, tma_url: str = "") -> None:
    """Start support mode."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user = await user_repo.get_by_telegram_id(tg_id)

    if not user or not user.encrypted_api_key:
        await message.answer("Please run /start first to set up your account.")
        return

    keyboard = add_open_in_app_row(None, tma_url, "support")
    await message.answer(
        "📊 *Support Mode*\n\n"
        "Describe your prospect or deal situation:\n"
        "📝 *Text* — role, company, context, what they said\n"
        "📸 *Photo* — LinkedIn screenshot, email, profile\n"
        "🎙️ *Voice* — just talk, I'll transcribe it\n\n"
        "I'll provide analysis, strategy, engagement tactics, and a draft response.\n\n"
        "🎙️ *Voice messages work great here!*\n\n"
        "_Photos are saved to your lead registry for tracking._",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )
    await state.set_state(SupportState.waiting_input)


async def _run_support_pipeline(
    *,
    user_input: str,
    tg_id: int,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
    status_msg: Message,
    state: FSMContext,
    engagement_service: EngagementService | None = None,
    shared_openrouter_key: str = "",
    photo_url: str | None = None,
    photo_key: str | None = None,
    input_type: str = "text",
    image_b64: str | None = None,
) -> None:
    """Run the strategist pipeline and log to lead registry."""
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await status_msg.edit_text("❌ Please run /start first.")
        await state.clear()
        return

    try:
        # Decrypt API key and create provider
        api_key = crypto.decrypt(user.encrypted_api_key)
        if not api_key:
            await status_msg.edit_text("❌ Failed to decrypt API key. Please update in /settings.")
            return

        model = user.openrouter_model if user.provider == "openrouter" else None
        llm = create_provider(user.provider, api_key, model)

        # Get user memory
        memory_record = await memory_repo.get(tg_id)
        memory_data = (memory_record.memory_data or {}) if memory_record else {}

        # Get casebook context
        casebook_text = await casebook_service.find_similar("unknown", "general")

        # Build pipeline context
        ctx = PipelineContext(
            llm=llm,
            knowledge_base=knowledge.combined,
            user_memory=memory_data,
            casebook_text=casebook_text,
            user_message=user_input,
            telegram_id=tg_id,
            user_id=user.id or 0,
            image_b64=image_b64,
        )

        # Run support pipeline
        pipeline_config = load_pipeline("support")
        runner = PipelineRunner(agent_registry)
        async with TraceContext(pipeline_name="support", telegram_id=tg_id, user_id=user.id or 0):
            async with ProgressUpdater(status_msg, Phase.ANALYSIS):
                await runner.run(pipeline_config, ctx)

        # Get strategist output
        strategist_result = ctx.get_result("strategist")
        if not strategist_result or not strategist_result.success:
            error = strategist_result.error if strategist_result else "Unknown error"
            await status_msg.edit_text(f"❌ Analysis failed: {error}")
            await llm.close()
            return

        output_data = strategist_result.data

        # Handle memory update from background agent
        memory_result = ctx.get_result("memory")
        if memory_result and memory_result.success:
            updated_memory = memory_result.data.get("updated_memory")
            if updated_memory:
                await memory_repo.update_memory(tg_id, updated_memory)

        # Save support session
        try:
            await session_repo.create(
                SupportSessionModel(
                    user_id=user.id,
                    telegram_id=tg_id,
                    input_text=user_input,
                    output_json=output_data,
                    provider_used=user.provider,
                )
            )
        except Exception as e:
            logger.error("Failed to save support session: %s", e)

        # Save to lead registry (before response so we have the lead ID for the button)
        saved_lead_id: int | None = None
        try:
            # Strategist output uses: analysis, strategy, engagement_tactics, draft
            analysis_obj = output_data.get("analysis", {})
            strategy_obj = output_data.get("strategy", {})
            tactics_obj = output_data.get("engagement_tactics", {})
            draft_obj = output_data.get("draft", {})

            # Serialize nested dicts to readable text for storage
            import json as _json

            def _dict_to_text(obj: dict | str) -> str:
                if isinstance(obj, str):
                    return obj
                return _json.dumps(obj, indent=2, ensure_ascii=False)

            # Extract structured prospect info (new format)
            prospect_info = output_data.get("prospect_info", {})
            if not isinstance(prospect_info, dict):
                prospect_info = {}

            prospect_first_name = prospect_info.get("first_name") or None
            prospect_last_name = prospect_info.get("last_name") or None
            prospect_geography = prospect_info.get("geography") or None

            # Clean up "Unknown" values
            _unknown_values = ("unknown", "n/a", "not specified", "not mentioned")
            if prospect_first_name and prospect_first_name.strip().lower() in _unknown_values:
                prospect_first_name = None
            if prospect_last_name and prospect_last_name.strip().lower() in _unknown_values:
                prospect_last_name = None
            if prospect_geography and prospect_geography.strip().lower() in _unknown_values:
                prospect_geography = None

            # Compose prospect_name from structured first/last name if available
            prospect_name: str | None = None
            if prospect_first_name and prospect_last_name:
                prospect_name = f"{prospect_first_name} {prospect_last_name}"
            elif prospect_first_name:
                prospect_name = prospect_first_name
            # Fall back to existing extraction if prospect_info didn't have name
            if not prospect_name:
                prospect_name = _extract_prospect_name_from_output(output_data, user_input)

            prospect_title = (
                _extract_field(analysis_obj, "seniority")
                or _extract_field(analysis_obj, "title")
                or _extract_field(analysis_obj, "role")
            )

            # Prefer structured company from prospect_info
            prospect_company_from_info = prospect_info.get("company") or None
            if prospect_company_from_info and prospect_company_from_info.strip().lower() not in _unknown_values:
                prospect_company = prospect_company_from_info
            else:
                prospect_company = (
                    _extract_prospect_company_from_output(output_data)
                    or _extract_field(analysis_obj, "company")
                )

            # Dedup: check if a similar lead already exists for this user
            existing_lead = await lead_repo.find_duplicate(tg_id, prospect_name, prospect_company)
            is_merge = False

            if existing_lead and existing_lead.id:
                # MERGE: update the existing lead with fresh analysis, keep rich data
                merge_updates: dict[str, Any] = {
                    "prospect_analysis": _dict_to_text(analysis_obj),
                    "closing_strategy": _dict_to_text(strategy_obj),
                    "engagement_tactics": _dict_to_text(tactics_obj),
                    "draft_response": _dict_to_text(draft_obj),
                    "original_context": user_input[:2000],
                }
                # Fill in name/title/company if previously missing
                if prospect_name and not existing_lead.prospect_name:
                    merge_updates["prospect_name"] = prospect_name
                if prospect_title and not existing_lead.prospect_title:
                    merge_updates["prospect_title"] = prospect_title
                if prospect_company and not existing_lead.prospect_company:
                    merge_updates["prospect_company"] = prospect_company
                if prospect_first_name and not existing_lead.prospect_first_name:
                    merge_updates["prospect_first_name"] = prospect_first_name
                if prospect_last_name and not existing_lead.prospect_last_name:
                    merge_updates["prospect_last_name"] = prospect_last_name
                if prospect_geography and not existing_lead.prospect_geography:
                    merge_updates["prospect_geography"] = prospect_geography
                # Update photo if new one provided
                if photo_url:
                    merge_updates["photo_url"] = photo_url
                if photo_key:
                    merge_updates["photo_key"] = photo_key

                await lead_repo.update_lead(existing_lead.id, **merge_updates)
                saved_lead_id = existing_lead.id
                is_merge = True
                logger.info("Merged into existing lead %s for user %s", existing_lead.id, tg_id)
            else:
                # CREATE new lead
                saved_lead = await lead_repo.create(
                    LeadRegistryModel(
                        user_id=user.id,
                        telegram_id=tg_id,
                        prospect_name=prospect_name,
                        prospect_first_name=prospect_first_name,
                        prospect_last_name=prospect_last_name,
                        prospect_title=prospect_title,
                        prospect_company=prospect_company,
                        prospect_geography=prospect_geography,
                        photo_url=photo_url,
                        photo_key=photo_key,
                        prospect_analysis=_dict_to_text(analysis_obj),
                        closing_strategy=_dict_to_text(strategy_obj),
                        engagement_tactics=_dict_to_text(tactics_obj),
                        draft_response=_dict_to_text(draft_obj),
                        input_type=input_type,
                        original_context=user_input[:2000],
                    )
                )
                saved_lead_id = saved_lead.id
                logger.info("New lead %s created for user %s", saved_lead_id, tg_id)

            # Fire background enrichment (web research + engagement plan)
            # Skip if merging into a lead that already has research
            needs_enrichment = not is_merge or not existing_lead or not existing_lead.web_research
            if engagement_service and saved_lead_id and shared_openrouter_key and needs_enrichment:
                asyncio.create_task(
                    _background_enrich_lead(
                        lead_id=saved_lead_id,
                        lead_repo=lead_repo,
                        engagement_service=engagement_service,
                        openrouter_api_key=shared_openrouter_key,
                        prospect_name=prospect_name,
                        prospect_company=prospect_company,
                        prospect_geography=prospect_geography,
                        original_context=user_input[:300],
                    )
                )
        except Exception as e:
            logger.error("Failed to save lead registry: %s", e)

        # Auto-save to casebook for team knowledge base
        try:
            persona = (
                _extract_field(analysis_obj, "persona")
                or _extract_field(analysis_obj, "buyer_type")
                or _extract_field(analysis_obj, "role")
                or "general"
            )
            industry = (
                _extract_field(analysis_obj, "industry")
                or _extract_field(analysis_obj, "sector")
            )
            seniority = (
                _extract_field(analysis_obj, "seniority")
                or _extract_field(analysis_obj, "level")
            )
            await casebook_service.maybe_save(
                persona_type=persona,
                scenario_type="deal_support",
                industry=industry,
                seniority=seniority,
                analysis=_dict_to_text(analysis_obj),
                strategy=_dict_to_text(strategy_obj),
                tactics=_dict_to_text(tactics_obj),
                draft=_dict_to_text(draft_obj),
                playbook_refs="",
                quality_score=0.8,
                accepted_first_draft=True,
                user_feedback="",
                telegram_id=tg_id,
            )
        except Exception as e:
            logger.error("Failed to save casebook entry: %s", e)

        # Format and send response
        response_text = format_support_response(output_data)
        if saved_lead_id and is_merge:
            lead_name = prospect_name or "this prospect"
            response_text += (
                f"\n\n"
                f"🔄 _Updated existing lead for {lead_name}. "
                f"Fresh analysis saved — tap \"View Lead & Plan\" to see full profile._"
            )
        elif saved_lead_id:
            response_text += (
                "\n\n"
                "💡 _Saved to your leads. Web research & engagement plan "
                "are generating in the background — tap \"View Lead & Plan\" "
                "in ~30s to see them._"
            )
        await status_msg.edit_text(
            response_text,
            reply_markup=_support_actions_keyboard(saved_lead_id),
        )

        # Store in state for regeneration
        await state.update_data(
            last_input=user_input,
            last_output=output_data,
            last_lead_id=saved_lead_id,
            provider=user.provider,
            photo_url=photo_url,
            photo_key=photo_key,
            input_type=input_type,
        )

        await llm.close()

    except Exception as e:
        logger.error("Support pipeline error: %s", e)
        await status_msg.edit_text(f"❌ Something went wrong: {str(e)[:200]}")


async def _background_enrich_lead(
    lead_id: int,
    lead_repo: LeadRegistryRepo,
    engagement_service: EngagementService,
    openrouter_api_key: str,
    prospect_name: str | None,
    prospect_company: str | None,
    prospect_geography: str | None = None,
    original_context: str | None = None,
) -> None:
    """Background task: web research + engagement plan generation for a new lead."""
    try:
        # Step 1: Web research via Grok
        research_query_parts = []
        if prospect_name:
            research_query_parts.append(prospect_name)
        if prospect_company:
            research_query_parts.append(prospect_company)
        if prospect_geography:
            research_query_parts.append(prospect_geography)

        # If no name/company, try to build query from stored analysis
        if not research_query_parts:
            lead_for_query = await lead_repo.get_by_id(lead_id)
            if lead_for_query and lead_for_query.prospect_analysis:
                analysis_text = lead_for_query.prospect_analysis[:500]
                if analysis_text.strip() not in ("", "{}", "null"):
                    research_query_parts.append(
                        f"Research this sales prospect based on the following analysis:\n{analysis_text}"
                    )
            # Also try original context, but NOT photo placeholders
            if not research_query_parts and original_context:
                if not original_context.startswith("[Photo attached"):
                    research_query_parts.append(original_context[:300])

        research = ""
        if research_query_parts:
            query = " ".join(research_query_parts)
            research = await web_research_call(openrouter_api_key, query)

        # Filter out garbage responses where the LLM asks for more info
        if research:
            first_100 = research.lower()[:100]
            if "please provide" in first_100 or "i need more" in first_100:
                research = ""

        if research:
            await lead_repo.update_lead(lead_id, web_research=research[:5000])

        # Step 2: Generate engagement plan
        lead = await lead_repo.get_by_id(lead_id)
        if not lead:
            return

        plan = await engagement_service.generate_plan(lead, research)
        if plan:
            # Schedule first followup 3 days from now
            next_followup = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
            await lead_repo.update_lead(
                lead_id, engagement_plan=plan, next_followup=next_followup
            )

        logger.info("Background enrichment complete for lead %s", lead_id)
    except Exception as e:
        logger.error("Background enrichment failed for lead %s: %s", lead_id, e)


def _extract_field(obj: str | dict, field: str) -> str | None:
    """Try to extract a field from analysis output (dict or text)."""
    if isinstance(obj, dict):
        # Try exact match and common variations
        for key in (field, field.capitalize(), field.upper(), field.lower()):
            if key in obj:
                val = obj[key]
                if val and str(val).strip():
                    return str(val).strip()[:200]
        # Also try partial key match (e.g. "company" matches "company_context")
        for key, val in obj.items():
            if field.lower() in key.lower() and val and str(val).strip():
                return str(val).strip()[:200]
    return None


def _extract_prospect_name_from_output(output_data: dict, user_input: str) -> str | None:
    """Extract prospect's actual name from strategist output.

    Checks (in priority order):
    1. draft.message — "Hi NAME —" pattern (most reliable)
    2. engagement_tactics text — "NAME's" possessive pattern
    3. analysis.seniority / background_leverage — "Name — Title" pattern
    4. Original user input — name-introducing patterns
    """
    import re

    _FALSE_NAMES = {"there", "team", "sir", "madam", "all", "everyone", "folks"}

    # 1. From draft message — the LLM almost always addresses the prospect by name
    draft_obj = output_data.get("draft", {})
    draft_text = ""
    if isinstance(draft_obj, dict):
        draft_text = draft_obj.get("message", "")
    elif isinstance(draft_obj, str):
        draft_text = draft_obj

    if draft_text:
        m = re.search(
            r"(?:Hi|Hey|Hello|Dear)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*[—,\-!]",
            draft_text,
        )
        if m:
            name = m.group(1).strip()
            if name.lower() not in _FALSE_NAMES:
                return name

    # 2. From engagement_tactics — "Like Arta's posts", "Comment on Arta's article"
    tactics_obj = output_data.get("engagement_tactics", {})
    if isinstance(tactics_obj, dict):
        for v in tactics_obj.values():
            text_parts = []
            if isinstance(v, str):
                text_parts.append(v)
            elif isinstance(v, list):
                text_parts.extend(str(x) for x in v)
            for part in text_parts:
                m = re.search(r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\b", part)
                if m:
                    name = m.group(1).strip()
                    if name.lower() not in ("linkedin", "their", "the", "company"):
                        return name

    # 3. From analysis fields — seniority might be "Name — COO at fund"
    analysis_obj = output_data.get("analysis", {})
    if isinstance(analysis_obj, dict):
        for field in ("seniority", "background_leverage"):
            val = analysis_obj.get(field, "")
            if val and isinstance(val, str):
                m = re.match(r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[—\-,]", val)
                if m:
                    return m.group(1).strip()

    # 4. From original user input (only if it's actual text, not a photo placeholder)
    if user_input and not user_input.startswith("[Photo attached"):
        m = re.search(
            r"(?:^|\n)\s*(?:name|prospect|person|contact|about|met|spoke with|talking to)"
            r"[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            user_input, re.IGNORECASE,
        )
        if m:
            return m.group(1).strip()[:100]

        # First line that's just a name (2-3 capitalized words, <40 chars)
        first_line = user_input.strip().split("\n")[0].strip()
        m2 = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$", first_line)
        if m2 and len(first_line) <= 40:
            return m2.group(1).strip()

    return None


def _extract_prospect_company_from_output(output_data: dict) -> str | None:
    """Extract company name from strategist output."""
    import re

    analysis_obj = output_data.get("analysis", {})
    if not isinstance(analysis_obj, dict):
        return None

    # From company_context — usually "CompanyName is doing X" or "CompanyName + description"
    cc = analysis_obj.get("company_context", "")
    if cc and isinstance(cc, str):
        cc = cc.strip()
        _skip = ("n/a", "unknown", "not specified", "not mentioned", "")
        if cc.lower() not in _skip:
            m = re.match(r"^([A-Z][a-zA-Z0-9.&']+(?:\s+[A-Z][a-zA-Z0-9.&']+)*)", cc)
            if m:
                company = m.group(1).strip()
                _generic = ("the", "their", "this", "they", "building", "company", "unknown")
                if company.lower() not in _generic:
                    return company[:100]

    # From background_leverage — "experience at Goldman"
    bl = analysis_obj.get("background_leverage", "")
    if bl and isinstance(bl, str):
        m = re.search(r"\bat\s+([A-Z][a-zA-Z0-9.&]+(?:\s+[A-Z][a-zA-Z0-9.&]+)*)", bl)
        if m:
            return m.group(1).strip()[:100]

    return None


@router.message(SupportState.waiting_input, F.photo)
async def on_support_photo(
    message: Message,
    state: FSMContext,
    bot: Bot,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
    insforge: InsForgeClient,
    engagement_service: EngagementService | None = None,
    shared_openrouter_key: str = "",
) -> None:
    """Process photo upload in support mode — download, store, analyze."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    status_msg = await message.answer("📸 Saving photo & analyzing prospect...")

    # Download the largest photo from Telegram
    photo = message.photo[-1]  # type: ignore[index]
    file = await bot.get_file(photo.file_id)

    file_bytes_io = io.BytesIO()
    await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
    file_bytes = file_bytes_io.getvalue()

    # Upload to InsForge storage
    photo_url: str | None = None
    photo_key: str | None = None
    try:
        key = f"leads/{tg_id}/{int(time.time())}_{photo.file_id[:12]}.jpg"
        result = await insforge.upload_file("prospect-photos", key, file_bytes, "image/jpeg")
        if result:
            photo_key = result.get("key", key)
            photo_url = result.get("url") or insforge.get_file_url("prospect-photos", photo_key)
            logger.info("Photo uploaded: %s", photo_url)
    except Exception as e:
        logger.error("Failed to upload photo to storage: %s", e)
        # Continue anyway — the analysis still works, just no photo stored

    # Encode photo for vision model
    photo_b64 = base64.b64encode(file_bytes).decode("ascii")

    # Use caption as context, or note that it's a photo
    user_input = message.caption or ""
    if not user_input:
        user_input = "[Photo attached — LinkedIn profile / prospect screenshot. Analyze the visible information in the image and provide a closing strategy.]"
    else:
        user_input = f"[Photo attached — prospect screenshot]\n\n{user_input}"

    await _run_support_pipeline(
        user_input=user_input,
        tg_id=tg_id,
        user_repo=user_repo,
        memory_repo=memory_repo,
        session_repo=session_repo,
        lead_repo=lead_repo,
        crypto=crypto,
        knowledge=knowledge,
        casebook_service=casebook_service,
        agent_registry=agent_registry,
        status_msg=status_msg,
        state=state,
        engagement_service=engagement_service,
        shared_openrouter_key=shared_openrouter_key,
        photo_url=photo_url,
        photo_key=photo_key,
        input_type="photo",
        image_b64=photo_b64,
    )


@router.message(SupportState.waiting_input, F.voice)
async def on_support_voice(
    message: Message,
    state: FSMContext,
    bot: Bot,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
    transcription: TranscriptionService,
    engagement_service: EngagementService | None = None,
    shared_openrouter_key: str = "",
) -> None:
    """Transcribe voice message and run through strategist pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]

    status_msg = await message.answer(
        "🎙️ Nice, a voice message! Love the energy.\n"
        "Give me a moment to listen and transcribe it..."
    )

    try:
        voice = message.voice
        file = await bot.get_file(voice.file_id)  # type: ignore[union-attr]
        file_bytes_io = io.BytesIO()
        await bot.download_file(file.file_path, file_bytes_io)  # type: ignore[arg-type]
        audio_bytes = file_bytes_io.getvalue()

        async with ProgressUpdater(status_msg, Phase.TRANSCRIPTION):
            text = await transcription.transcribe(audio_bytes)

        await status_msg.edit_text(
            f"📝 I heard:\n\"{text}\"\n\n🔄 Analyzing your prospect...",
            parse_mode=None,
        )
    except Exception as e:
        logger.error("Voice transcription failed: %s", e)
        await status_msg.edit_text(f"❌ Couldn't transcribe voice: {str(e)[:200]}\n\nPlease try again or type your message.")
        return

    await _run_support_pipeline(
        user_input=text,
        tg_id=tg_id,
        user_repo=user_repo,
        memory_repo=memory_repo,
        session_repo=session_repo,
        lead_repo=lead_repo,
        crypto=crypto,
        knowledge=knowledge,
        casebook_service=casebook_service,
        agent_registry=agent_registry,
        status_msg=status_msg,
        state=state,
        engagement_service=engagement_service,
        shared_openrouter_key=shared_openrouter_key,
        input_type="voice",
    )


@router.message(SupportState.waiting_input)
async def on_support_input(
    message: Message,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    session_repo: SupportSessionRepo,
    lead_repo: LeadRegistryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
    engagement_service: EngagementService | None = None,
    shared_openrouter_key: str = "",
) -> None:
    """Process text input through strategist pipeline."""
    tg_id = message.from_user.id  # type: ignore[union-attr]
    user_input = message.text or ""

    result = validate_user_input(user_input, context="support", min_length=10)
    if not result.is_valid:
        if result.is_command:
            if result.suggested_command == "/cancel":
                await state.clear()
                await message.answer("Support session cancelled.")
                return
            if result.suggested_command and result.suggested_command != "unknown":
                await state.clear()
                await message.answer(
                    f"Looks like you meant {result.suggested_command}. "
                    f"I've cancelled the support session. Try the command again."
                )
            else:
                await state.clear()
                await message.answer(
                    "That looks like a command. I've cancelled the support session. "
                    "Try your command again."
                )
            return
        await message.answer(result.error_message)
        return
    user_input = result.cleaned_input

    status_msg = await message.answer("🔄 Analyzing your prospect...")

    await _run_support_pipeline(
        user_input=user_input,
        tg_id=tg_id,
        user_repo=user_repo,
        memory_repo=memory_repo,
        session_repo=session_repo,
        lead_repo=lead_repo,
        crypto=crypto,
        knowledge=knowledge,
        casebook_service=casebook_service,
        agent_registry=agent_registry,
        status_msg=status_msg,
        state=state,
        engagement_service=engagement_service,
        shared_openrouter_key=shared_openrouter_key,
    )


@router.callback_query(F.data.startswith("support:"))
async def on_support_action(
    callback: CallbackQuery,
    state: FSMContext,
    user_repo: UserRepo,
    memory_repo: UserMemoryRepo,
    crypto: CryptoService,
    knowledge: KnowledgeService,
    casebook_service: CasebookService,
    agent_registry: AgentRegistry,
) -> None:
    """Handle support action buttons (regenerate, shorter, aggressive)."""
    action = callback.data.split(":")[1]  # type: ignore[union-attr]

    if action == "done":
        await callback.message.edit_reply_markup(reply_markup=None)  # type: ignore[union-attr]
        await callback.answer("✅ Done!")
        await state.clear()
        return

    data = await state.get_data()
    original_input = data.get("last_input", "")

    if not original_input:
        await callback.answer("No previous input found. Send a new message.")
        return

    tg_id = callback.from_user.id
    user = await user_repo.get_by_telegram_id(tg_id)
    if not user or not user.encrypted_api_key:
        await callback.answer("Please run /start first.")
        return

    await callback.answer("🔄 Working...")

    # Modify input based on action
    modifier = ""
    if action == "regen":
        modifier = "\n\n[System: Regenerate with a fresh approach. Different angle, different strategy.]"
    elif action == "shorter":
        modifier = "\n\n[System: Make the response significantly shorter and more concise. Focus on the key actionable points only.]"
    elif action == "aggressive":
        modifier = "\n\n[System: Use a more aggressive, confident closing approach. Push harder for the meeting/next step.]"

    try:
        api_key = crypto.decrypt(user.encrypted_api_key)
        if not api_key:
            await callback.answer("Key error")
            return

        model = user.openrouter_model if user.provider == "openrouter" else None
        llm = create_provider(user.provider, api_key, model)

        memory_record = await memory_repo.get(tg_id)
        memory_data = (memory_record.memory_data or {}) if memory_record else {}
        casebook_text = await casebook_service.find_similar("unknown", "general")

        ctx = PipelineContext(
            llm=llm,
            knowledge_base=knowledge.combined,
            user_memory=memory_data,
            casebook_text=casebook_text,
            user_message=original_input + modifier,
            telegram_id=tg_id,
            user_id=user.id or 0,
        )

        pipeline_config = load_pipeline("support")
        runner = PipelineRunner(agent_registry)
        async with TraceContext(pipeline_name="support_regen", telegram_id=tg_id, user_id=user.id or 0):
            async with ProgressUpdater(callback.message, Phase.ANALYSIS):  # type: ignore[arg-type]
                await runner.run(pipeline_config, ctx)

        strategist_result = ctx.get_result("strategist")
        if strategist_result and strategist_result.success:
            response_text = format_support_response(strategist_result.data)
            lead_id = data.get("last_lead_id")
            if lead_id:
                response_text += (
                    "\n\n"
                    "💡 _Tap \"View Lead & Plan\" to see web research, "
                    "engagement steps, and get AI advice._"
                )
            await callback.message.edit_text(  # type: ignore[union-attr]
                response_text,
                reply_markup=_support_actions_keyboard(lead_id),
            )
            await state.update_data(last_output=strategist_result.data)

        await llm.close()

    except Exception as e:
        logger.error("Support action error: %s", e)
        await callback.answer(f"Error: {str(e)[:100]}")
