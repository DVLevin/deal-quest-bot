/**
 * Static train scenario pool extracted from data/scenarios.json -> train_pool.
 *
 * The TMA runs in a browser and cannot access the bot's filesystem.
 * This file compiles the train pool into the bundle as TypeScript constants.
 * Used as a fallback when the generated_scenarios table is empty.
 *
 * Source of truth: data/scenarios.json -> train_pool.scenarios (20 scenarios)
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TrainScenario {
  id: string;
  category: string;
  difficulty: 1 | 2 | 3;
  persona: {
    name: string;
    role: string;
    company: string;
    background: string;
  };
  situation: string;
  scoringFocus: string[];
  idealResponse: string;
  /** Optional A/B branching options for TRAIN-06 */
  branchingOptions?: {
    optionA: string;
    optionB: string;
  };
}

// ---------------------------------------------------------------------------
// Static data (mirrors data/scenarios.json -> train_pool.scenarios)
// ---------------------------------------------------------------------------

export const TRAIN_POOL: TrainScenario[] = [
  {
    id: 'train_001',
    category: 'corporate_objection',
    difficulty: 3,
    persona: {
      name: 'Sarah Mitchell',
      role: 'VP of Corporate Strategy',
      company: 'Oracle',
      background: '10 years at Oracle, leads AI acquisition strategy',
    },
    situation:
      "Sarah says: 'We looked at platforms like yours before. The problem is the companies are usually not enterprise-ready. We need $5M+ ARR minimum and SOC2 compliance. Do you actually have assets at that level?'",
    scoringFocus: ['enterprise_qualification', 'proof_points', 'not_defensive'],
    idealResponse:
      "Valid concern \u2014 enterprise readiness is non-negotiable for Oracle-scale acquisitions. We do have assets at that level, though they're a smaller portion of our pipeline. Our vetting specifically includes compliance status (SOC2, HIPAA where relevant) and revenue verification via QuickBooks/Xero integrations.\n\nRather than make claims, let me show you: I can share an anonymized profile of a $6M ARR AI company with SOC2 Type II that's currently exploring strategic options. Interested?",
  },
  {
    id: 'train_002',
    category: 'pe_cold_outreach',
    difficulty: 2,
    persona: {
      name: 'Michael Torres',
      role: 'Principal',
      company: 'Vista Equity Partners',
      background: 'Focuses on enterprise software add-ons',
    },
    situation:
      "Cold outreach response: 'We get hundreds of deal sources reaching out. What's your hit rate? How many deals have you actually closed?'",
    scoringFocus: ['credibility', 'metrics', 'honest_positioning'],
    idealResponse:
      "Fair question \u2014 we're selective about who we work with for exactly this reason. We're focused on quality over volume.\n\nWe're early but building traction: [X] assets currently on platform, [Y] active buyer conversations, [Z] in diligence. For Vista specifically, we've identified 3 AI companies that fit your enterprise software add-on thesis.\n\nWant me to share anonymized profiles? You can judge the quality firsthand.",
  },
  {
    id: 'train_003',
    category: 'founder_pricing',
    difficulty: 2,
    persona: {
      name: 'Lisa Wong',
      role: 'CEO',
      company: 'AIWritePro',
      background: '$400K ARR, AI writing assistant, bootstrapped',
    },
    situation:
      "Lisa asks: 'I looked at your fee structure. 7% on the first million seems steep compared to what I've heard about investment bankers. Why should I pay that?'",
    scoringFocus: ['fee_justification', 'value_alignment', 'comparison'],
    idealResponse:
      "I get the comparison, but let me break down the actual economics:\n\nTraditional bankers charge $50-100K retainer upfront PLUS 4-6% success fee, require 6-12 month exclusivity, and often don't specialize in AI.\n\nOur model: Zero upfront, success-fee only, no exclusivity. You pay nothing unless we deliver. And at your revenue level, our fee structure is actually lower total cost than most banker engagements.\n\nMore importantly: we're aligned. If we don't close a deal that works for you, we make nothing.\n\nDoes that help clarify the value?",
  },
  {
    id: 'train_004',
    category: 'vc_portfolio',
    difficulty: 2,
    persona: {
      name: 'Jennifer Park',
      role: 'Partner',
      company: 'Amplify Partners',
      background: 'AI-focused VC, 15 portfolio companies',
    },
    situation:
      "Jennifer says: 'Some of my portfolio companies might be interested, but I'm worried about signaling. If word gets out they're exploring exits, it could hurt their fundraising options. How do you handle that?'",
    scoringFocus: ['confidentiality_depth', 'vc_specific', 'process_control'],
    idealResponse:
      "That's the exact concern we're designed for. The process is founder-controlled and confidential:\n\n1. Listing starts anonymized \u2014 no company name in initial teaser\n2. Buyers sign NDAs before any identifying info shared\n3. Founders approve each buyer introduction individually\n4. No public presence \u2014 nothing shows up in searches\n\nFor your portfolio companies specifically: they can explore quietly without any market signal. If they find the right buyer, great. If not, no one knows they were looking.\n\nWant to discuss specific portfolio companies that might benefit?",
  },
  {
    id: 'train_005',
    category: 'founder_timing',
    difficulty: 1,
    persona: {
      name: 'Ryan Foster',
      role: 'CEO',
      company: 'DataLens AI',
      background: 'Pre-revenue, just closed seed round',
    },
    situation:
      "Ryan says: 'We just closed our seed round. Isn't it too early to think about exits? I feel like I should focus on building for now.'",
    scoringFocus: ['timing_education', 'not_pushy', 'relationship_building'],
    idealResponse:
      "Totally fair \u2014 and you're right that building should be the focus right now. We typically work with companies that are 3-5 years post-seed when they're actually ready to explore.\n\nThat said, it's worth understanding the landscape early. Knowing what acquirers look for can actually inform how you build \u2014 features that drive enterprise value, metrics buyers care about, etc.\n\nNo rush on our end. Happy to stay in touch and be a resource when the timing makes sense. Mind if I check in in a year or so?",
  },
  {
    id: 'train_006',
    category: 'corporate_technical',
    difficulty: 3,
    persona: {
      name: 'Dr. Amanda Chen',
      role: 'VP of AI/ML',
      company: 'Salesforce',
      background: 'PhD Stanford, leads AI acquisition technical DD',
    },
    situation:
      "Amanda says: 'The AI companies we evaluate often have impressive demos but weak fundamentals \u2014 no real moat, training data that can't scale, or architectures that won't integrate. How do you vet for technical quality?'",
    scoringFocus: ['technical_credibility', 'vetting_depth', 'specific_criteria'],
    idealResponse:
      "You're describing exactly why we exist. Surface-level AI is everywhere; defensible AI is rare.\n\nOur technical vetting examines:\n1. **Data moat** \u2014 Is training data proprietary? Can it scale? Legal to use?\n2. **Architecture** \u2014 Custom models vs. API wrappers? Integration complexity?\n3. **IP defensibility** \u2014 Patents, trade secrets, unique techniques?\n4. **Team depth** \u2014 Research vs. engineering balance? Key-person risk?\n\nWe flag companies that are 'demo-ware' vs. genuinely differentiated. Our founder [name] spent [X years] at [relevant company] doing exactly this kind of technical DD.\n\nWant to see how we profiled a recent asset? I can share our technical assessment methodology.",
  },
  {
    id: 'train_007',
    category: 'founder_valuation',
    difficulty: 3,
    persona: {
      name: 'Marcus Johnson',
      role: 'CEO & Co-Founder',
      company: 'PredictAI',
      background: '$2M ARR, predictive analytics, Series A',
    },
    situation:
      "Marcus says: 'I've heard AI companies are getting crazy multiples \u2014 like 20-30x ARR. Is that realistic? I don't want to list and then find out buyers are offering 5x.'",
    scoringFocus: ['valuation_honesty', 'market_education', 'expectation_setting'],
    idealResponse:
      "Good to have this conversation upfront. Here's the reality:\n\n20-30x ARR multiples exist but they're outliers \u2014 typically high-growth (100%+ YoY), strategic acquisitions by big tech, or bidding wars. Most AI company transactions are in the 5-12x range depending on growth, retention, and strategic value.\n\nAt $2M ARR, your multiple depends heavily on: growth rate, net retention, customer concentration, and how strategic you are to specific buyers.\n\nOur job is to surface multiple buyers and create competitive tension \u2014 that's how you get fair value, not by anchoring to outlier headlines.\n\nWant to walk through what realistic scenarios look like for PredictAI specifically?",
  },
  {
    id: 'train_008',
    category: 'pe_add_on',
    difficulty: 2,
    persona: {
      name: 'Robert Kim',
      role: 'Operating Partner',
      company: 'Thoma Bravo',
      background: 'Leads AI bolt-on strategy for portfolio',
    },
    situation:
      "Robert says: 'We're specifically looking for AI add-ons for our portfolio company DataStack. Need companies in data infrastructure with $1-3M ARR. Do you have anything that specific?'",
    scoringFocus: ['specificity_matching', 'process_knowledge', 'realistic_response'],
    idealResponse:
      "That's exactly the kind of specific brief we work with. Data infrastructure + $1-3M ARR + add-on ready \u2014 narrow but we can work with it.\n\nLet me check our current pipeline against those criteria. We may have 1-2 matches, and if not, we can proactively source against that thesis.\n\nFor DataStack specifically: What's the integration requirement? Are you looking for technology, team, or customer base primarily? That'll help us filter.\n\nI'll come back to you within 48 hours with any relevant matches \u2014 anonymized profiles you can review before we go further.",
  },
  {
    id: 'train_009',
    category: 'founder_team',
    difficulty: 2,
    persona: {
      name: 'Priya Sharma',
      role: 'CEO',
      company: 'VisionAI Labs',
      background: '$600K ARR, computer vision, 8 employees',
    },
    situation:
      "Priya says: 'My biggest concern is what happens to my team in an acquisition. I've heard horror stories about acqui-hires where everyone gets laid off within a year. How do I protect them?'",
    scoringFocus: ['empathy', 'deal_structure_knowledge', 'honest_guidance'],
    idealResponse:
      "That's a critical concern and it's good you're thinking about it early.\n\nThe outcome depends heavily on deal structure and buyer type:\n- **Strategic acquirers** (building long-term) typically retain teams for integration\n- **Acqui-hires** explicitly value the team \u2014 retention packages are standard\n- **PE buyers** vary \u2014 some optimize, some grow\n\nYou have leverage here. Team retention commitments, earnouts tied to team staying, and vesting acceleration can all be negotiated.\n\nWe help founders navigate these terms. When we match you with buyers, we can filter for those with track records of keeping teams intact.\n\nWant to discuss what protection mechanisms look like in practice?",
  },
  {
    id: 'train_010',
    category: 'corporate_competition',
    difficulty: 3,
    persona: {
      name: 'David Martinez',
      role: 'Director of M&A',
      company: 'Adobe',
      background: 'Led 5 AI acquisitions in past 3 years',
    },
    situation:
      "David says: 'We already have relationships with all the major AI VCs and see most deals through our network. I'm not sure a platform adds value for a buyer like us who's already well-connected.'",
    scoringFocus: ['differentiation', 'off_market_value', 'not_defensive'],
    idealResponse:
      "You're right that Adobe's network is extensive \u2014 and for deals that come through traditional channels, you don't need us.\n\nWhere we add value is different: off-market founders who don't want to broadcast they're exploring, companies outside the usual VC ecosystem (bootstrapped, international, niche verticals), and opportunities that aren't making the rounds.\n\nWe also handle initial screening and technical DD \u2014 so when an asset reaches you, it's pre-qualified against your criteria, saving your team's time.\n\nThe question isn't whether you see deals \u2014 it's whether you're seeing the right ones efficiently. Want me to show you a few current assets that haven't been shopped through traditional channels?",
  },
  {
    id: 'train_011',
    category: 'family_office',
    difficulty: 2,
    persona: {
      name: 'William Chen',
      role: 'Principal',
      company: 'Chen Family Office',
      background: 'Tech-focused single family office, $500M AUM',
    },
    situation:
      "William says: 'We're interested in AI but we're not a typical buyer \u2014 we do longer holds, don't have integration teams, and prefer minority stakes sometimes. Do you work with investors like us?'",
    scoringFocus: ['buyer_type_knowledge', 'flexibility', 'honest_fit_assessment'],
    idealResponse:
      "Absolutely \u2014 family offices are one of our five core buyer types, and your approach (longer holds, minority stakes possible) is actually attractive to certain founders.\n\nMany AI founders prefer patient capital over quick flips. For companies not ready for full exit but wanting strategic partnership + capital, a family office stake can be ideal.\n\nOur platform supports various transaction structures \u2014 not just full acquisitions. We can filter for companies open to minority investments and longer partnership horizons.\n\nWant to discuss your specific criteria? I'd want to understand: check size range, sectors within AI, and level of involvement you typically want.",
  },
  {
    id: 'train_012',
    category: 'founder_process',
    difficulty: 1,
    persona: {
      name: "Kevin O'Brien",
      role: 'Founder',
      company: 'AIRecruitPro',
      background: '$300K ARR, AI recruiting tool, bootstrapped',
    },
    situation:
      "Kevin asks: 'I've never been through an M&A process before. What does the typical timeline look like from listing with you to actually closing a deal?'",
    scoringFocus: ['process_clarity', 'realistic_expectations', 'education'],
    idealResponse:
      "Great question \u2014 setting realistic expectations is important.\n\nTypical timeline from listing to close: 6-12 months. Here's the breakdown:\n\n**Month 1-2:** Onboarding, vetting, building your asset profile\n**Month 2-4:** Matching with buyers, initial introductions, NDAs\n**Month 4-6:** Deeper conversations, data room access, preliminary offers\n**Month 6-12:** LOI negotiation, due diligence, legal, close\n\nFactors that speed things up: clear financials, clean cap table, motivated buyer, smaller deal size.\n\nFactors that slow down: complex structures, multiple founders, regulatory considerations.\n\nThe confidential nature means you can run this process while continuing to operate normally \u2014 no disruption to your business.\n\nWant to start with an initial consultation to assess where you'd fall on this timeline?",
  },
  {
    id: 'train_013',
    category: 'vc_returns',
    difficulty: 3,
    persona: {
      name: 'Andrew Walsh',
      role: 'Managing Partner',
      company: 'First Round Capital',
      background: 'Early-stage VC, portfolio includes 3 AI unicorns',
    },
    situation:
      "Andrew says: 'My LPs expect 3x+ returns. Most M&A exits I've seen for AI companies at Series A stage end up being talent acquisitions at 1-2x. How do you help portfolio companies avoid that outcome?'",
    scoringFocus: ['vc_economics', 'value_maximization', 'strategic_positioning'],
    idealResponse:
      "That's the right concern \u2014 acqui-hire pricing is the floor, not the goal.\n\nHow we help avoid 1-2x outcomes:\n\n1. **Timing:** Engage when there's optionality, not desperation. Running out of runway = bad leverage.\n\n2. **Positioning:** We help companies tell a strategic narrative, not a 'team for sale' story.\n\n3. **Competition:** Surface multiple buyers simultaneously. Nothing kills acqui-hire pricing like a bidding war.\n\n4. **Buyer selection:** Some acquirers (Google, Meta) default to talent acquisition. Others (mid-market strategics, PE) pay for the business.\n\nFor your portfolio specifically: companies 3-5 years post-Series A with real revenue are in the sweet spot \u2014 they have optionality and value beyond just team.\n\nWant to discuss specific portfolio companies that might be approaching that window?",
  },
  {
    id: 'train_014',
    category: 'founder_exclusivity',
    difficulty: 2,
    persona: {
      name: 'Nina Patel',
      role: 'CEO',
      company: 'MedAI Diagnostics',
      background: '$1.5M ARR, FDA-cleared AI diagnostics',
    },
    situation:
      "Nina says: 'A banker we talked to wanted 12-month exclusivity. I'm nervous about locking in with anyone for that long. What's your exclusivity requirement?'",
    scoringFocus: ['differentiation', 'founder_friendly', 'trust_building'],
    idealResponse:
      "We don't require exclusivity \u2014 at all.\n\nHere's why: Exclusivity protects bankers, not founders. They want guaranteed commission even if they underperform.\n\nOur model is different: Success-fee only means we only get paid if we deliver value. If you find a better path through your own network or another channel, that's fine \u2014 we haven't cost you anything.\n\nYou can work with us while keeping other options open. Many founders appreciate that flexibility, especially in healthcare AI where regulatory timelines and strategic buyer cycles are unpredictable.\n\nThe trade-off: We're selective about who we work with since we're taking the risk. But once we commit, we're fully aligned with your outcome.\n\nDoes that structure work better for what you're looking for?",
  },
  {
    id: 'train_015',
    category: 'corporate_speed',
    difficulty: 2,
    persona: {
      name: 'Rachel Torres',
      role: 'Head of Corp Dev',
      company: 'Snowflake',
      background: 'Fast-moving data company, aggressive AI strategy',
    },
    situation:
      "Rachel says: 'We move fast. When we see something we want, we can close in 60 days. But most deal sources waste our time with companies that aren't ready or willing. How do you qualify seller readiness?'",
    scoringFocus: ['process_rigor', 'buyer_respect', 'qualification_depth'],
    idealResponse:
      "Speed matters to us too \u2014 wasting your time means wasting ours.\n\nHow we qualify seller readiness:\n\n1. **Motivation:** We assess why they're exploring and confirm they're genuinely open to transactions, not just 'testing the market'\n\n2. **Timeline:** Explicit conversation about their decision timeframe and board alignment\n\n3. **Data room:** We don't introduce companies that can't provide clean financials, cap table, and technical documentation within 2 weeks\n\n4. **Valuation expectations:** Pre-aligned on realistic ranges before introductions\n\nFor Snowflake specifically: When I send you a company, it means they're ready to engage seriously and can match your 60-day pace.\n\nWant me to flag companies in our pipeline that meet your readiness criteria?",
  },
  {
    id: 'train_016',
    category: 'founder_employees',
    difficulty: 2,
    persona: {
      name: 'Tom Anderson',
      role: 'CEO',
      company: 'LogicAI',
      background: '$800K ARR, enterprise automation, 15 employees',
    },
    situation:
      "Tom asks: 'When do I have to tell my employees I'm exploring a sale? I don't want to deal with the anxiety and potential departures.'",
    scoringFocus: ['confidentiality_process', 'practical_guidance', 'empathy'],
    idealResponse:
      "Ideally: As late as possible, which is usually after LOI or during final diligence.\n\nThe confidential nature of our process means:\n- Initial exploration: No one needs to know\n- Buyer conversations: Still confidential\n- LOI stage: Some disclosure may be needed (key employees, board)\n- Final diligence: Broader team usually learns\n\nThat said, you control the timeline. Some founders bring in key lieutenants early for input. Others keep it to themselves until deal is nearly done.\n\nThe goal is avoiding months of uncertainty for your team. A compressed, well-managed disclosure is better than prolonged anxiety.\n\nWe can help you plan the communication strategy when the time comes. Want to discuss how other founders have handled this?",
  },
  {
    id: 'train_017',
    category: 'pe_diligence',
    difficulty: 3,
    persona: {
      name: 'Christina Lee',
      role: 'Vice President',
      company: 'Summit Partners',
      background: 'Growth equity, focuses on AI/ML companies',
    },
    situation:
      "Christina says: 'Our diligence process is extensive \u2014 3-4 months minimum. We need detailed technical DD, customer references, financial verification. Do your companies actually have their house in order for that level of scrutiny?'",
    scoringFocus: ['diligence_readiness', 'quality_standards', 'process_support'],
    idealResponse:
      "That level of diligence is exactly what serious buyers should do \u2014 and exactly why thorough vetting matters upfront.\n\nOur onboarding process specifically prepares companies for institutional DD:\n\n**Technical:** Architecture documentation, code quality assessment, data practices review\n**Financial:** Verified via QuickBooks/Xero integrations, not just self-reported\n**Customer:** We confirm reference-ability before listing\n**Legal:** Cap table clean, IP assignments confirmed, no obvious landmines\n\nCompanies that can't meet these standards don't make it to our platform.\n\nFor Summit specifically: We can flag which companies in our pipeline have already passed institutional-grade vetting vs. those earlier in the process.\n\nWant to see our DD checklist and discuss what 'Summit-ready' looks like?",
  },
  {
    id: 'train_018',
    category: 'founder_multiple_buyers',
    difficulty: 2,
    persona: {
      name: 'James Liu',
      role: 'CEO',
      company: 'AISecure',
      background: '$2M ARR, AI cybersecurity, Series A',
    },
    situation:
      "James asks: 'How many buyers will you typically introduce me to? I want to make sure I have options, but I also don't want to run a circus.'",
    scoringFocus: ['process_management', 'quality_over_quantity', 'founder_control'],
    idealResponse:
      "Typically 5-10 qualified introductions, but quality matters more than quantity.\n\nOur approach:\n1. **Initial matching:** We identify 15-20 potential fits based on your profile\n2. **Curated outreach:** We approach the best-fit buyers with your anonymized teaser\n3. **Qualified introductions:** Only buyers who express genuine interest after NDA get introduced\n\nYou control the pace. Some founders prefer sequential conversations (less overhead). Others want parallel processes (creates urgency).\n\nThe goal is 3-5 serious conversations, not 50 tire-kickers. Competition matters, but so does your time.\n\nFor AISecure specifically: Cybersecurity AI is hot right now. I'd expect strong interest from both strategics (Palo Alto, CrowdStrike) and PE. Want to discuss which buyer types make most sense?",
  },
  {
    id: 'train_019',
    category: 'corporate_integration',
    difficulty: 3,
    persona: {
      name: 'Mark Stevens',
      role: 'SVP of Engineering',
      company: 'ServiceNow',
      background: 'Leads AI integration for acquisitions',
    },
    situation:
      "Mark says: 'The last AI company we acquired took 18 months to integrate and the key engineers left. Technical debt was worse than disclosed. How do you vet for integration readiness?'",
    scoringFocus: ['technical_depth', 'integration_assessment', 'honest_limitations'],
    idealResponse:
      "Integration failures like that are exactly why technical vetting matters \u2014 and why surface-level pitches are dangerous.\n\nOur technical assessment specifically examines:\n\n**Architecture:** Monolith vs. microservices, API design, dependency complexity\n**Code quality:** Test coverage, documentation, technical debt indicators\n**Team structure:** Key-person risk, knowledge distribution, flight risk factors\n**Integration complexity:** What's required to work within your stack\n\nWe can't guarantee perfect integration \u2014 that depends on your team's execution too. But we can surface red flags early and give you honest assessment of complexity.\n\nFor ServiceNow specifically: What's your integration architecture? Understanding your target state helps us filter for companies that'll fit vs. fight your stack.\n\nWant to review how we assessed a recent company's integration readiness?",
  },
  {
    id: 'train_020',
    category: 'founder_earnout',
    difficulty: 3,
    persona: {
      name: 'Sarah Kim',
      role: 'CEO & Co-Founder',
      company: 'NLPWorks',
      background: '$1M ARR, NLP platform, 2 co-founders',
    },
    situation:
      "Sarah asks: 'A buyer mentioned most of the deal value would be in an earnout tied to performance. That seems risky \u2014 what if they deliberately tank our metrics? How do I think about earnout structures?'",
    scoringFocus: ['deal_structure_expertise', 'founder_protection', 'negotiation_guidance'],
    idealResponse:
      "Valid concern \u2014 earnouts can be traps if structured poorly.\n\nKey protections to negotiate:\n\n**Control:** If earnout depends on metrics, you need operational control to hit them. Beware buyers who take control then set impossible targets.\n\n**Definitions:** Crystal clear metric definitions. Revenue = what exactly? GAAP? Bookings? Specific products?\n\n**Acceleration:** What happens if they sell the business or kill the product? You should get paid out.\n\n**Cap:** Is there upside participation or just downside risk?\n\nHealthy earnout structures:\n- 50-70% at close (guaranteed value)\n- 30-50% earnout tied to reasonable, controllable metrics\n- 12-24 month timeframe (not 4 years)\n\nRed flags: >50% in earnout, metrics you don't control, no acceleration clauses.\n\nWe help founders negotiate these terms. Want to walk through what a fair structure looks like for NLPWorks?",
  },
];
