"""FSM states for aiogram handlers."""

from aiogram.fsm.state import State, StatesGroup


class OnboardingState(StatesGroup):
    choosing_provider = State()
    entering_api_key = State()


class SupportState(StatesGroup):
    waiting_input = State()


class LearnState(StatesGroup):
    viewing_lesson = State()
    answering_scenario = State()


class TrainState(StatesGroup):
    answering_scenario = State()


class LeadEngagementState(StatesGroup):
    viewing_lead = State()
    adding_context = State()
    sending_screenshot = State()
    editing_lead = State()
    reresearch_input = State()


class CommentSupportState(StatesGroup):
    waiting_screenshot = State()
    refining_comment = State()


class ReanalysisState(StatesGroup):
    """States for context input and re-analysis flow."""
    collecting_context = State()      # Waiting for context input (text/voice/photo/forward)
    confirming_reanalysis = State()   # Showing "Re-analyze Strategy?" button
    updating_plan = State()           # Showing "Update engagement plan too?" button


class SettingsState(StatesGroup):
    main_menu = State()
    changing_provider = State()
    entering_new_key = State()
    choosing_model = State()
