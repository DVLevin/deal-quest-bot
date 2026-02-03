/**
 * Static track/level/lesson/scenario data extracted from data/scenarios.json.
 *
 * The TMA runs in a browser and cannot access the bot's filesystem.
 * This file compiles the track data into the bundle as TypeScript constants.
 *
 * Source of truth: data/scenarios.json -> learn_tracks.track_1
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TrackLevel {
  id: string;
  name: string;
  lesson: {
    title: string;
    content: string;
    keyPoints: string[];
  };
  scenario: {
    id: string;
    persona: {
      name: string;
      role: string;
      company: string;
      background: string;
      context?: string;
    };
    situation: string;
    difficulty: number;
    timeLimitSeconds?: number;
    idealResponse: string;
    commonMistakes?: string[];
  };
}

export interface Track {
  id: string;
  name: string;
  description: string;
  levels: TrackLevel[];
}

// ---------------------------------------------------------------------------
// Static data (mirrors data/scenarios.json -> learn_tracks.track_1)
// ---------------------------------------------------------------------------

export const TRACKS: Record<string, Track> = {
  foundations: {
    id: 'foundations',
    name: 'Foundations',
    description: 'Master the basics of GetDeal.ai positioning',
    levels: [
      {
        id: '1.1',
        name: 'What is GetDeal.ai?',
        lesson: {
          title: 'The Core Identity',
          content:
            'GetDeal.ai is an M&A marketplace for AI companies. NOT a fundraising platform. NOT a job board. We connect AI startups seeking EXITS (full acquisitions or 20%+ stakes) with strategic acquirers, PE firms, and corporates.',
          keyPoints: [
            'M&A marketplace, NOT fundraising',
            'Full exits or 20%+ strategic stakes',
            'AI companies specifically (Seed to Series B)',
            'Buyers: Corporates, PE, Late-Stage VCs, Family Offices, Funded Companies',
          ],
        },
        scenario: {
          id: 'learn_1_1',
          persona: {
            name: 'Alex Thompson',
            role: 'Partner at Sequoia',
            company: 'Sequoia Capital',
            background: '20 years in VC, board member of 12 AI companies',
            context: 'Conference networking event, cocktails in hand',
          },
          situation:
            "You're at a VC conference. Alex approaches you: 'Hey, I keep hearing about GetDeal.ai but I'm not totally clear on what you guys do. Is it like AngelList or something?'",
          difficulty: 1,
          timeLimitSeconds: 60,
          idealResponse:
            "Not quite \u2014 we're actually the opposite. GetDeal.ai is an M&A marketplace for AI companies. We connect AI startups looking to exit with strategic acquirers, PE firms, and corporates looking to buy. Think curated deal flow, not fundraising. Your portfolio companies that are 3-5 years post-Series A and exploring options? We're their confidential path to acquirers.",
          commonMistakes: [
            'Comparing to fundraising platforms',
            'Being too vague about buyer types',
            'Forgetting to mention confidentiality',
            'Going too long for a cocktail conversation',
          ],
        },
      },
      {
        id: '1.2',
        name: 'Platform Positioning',
        lesson: {
          title: "We're Not Bankers",
          content:
            'GetDeal.ai is often compared to investment bankers. Key differences: (1) Success-fee ONLY \u2014 no retainers, (2) No exclusivity required, (3) Confidentiality-first design, (4) AI-specific buyer network, (5) Technical due diligence expertise.',
          keyPoints: [
            'Success-fee only \u2014 pay nothing unless we help close',
            'No exclusivity \u2014 founders keep their options',
            "Confidentiality-first \u2014 team and competitors don't know",
            'AI-specific buyers \u2014 not generalist contacts',
            'Technical DD \u2014 we understand AI architectures',
          ],
        },
        scenario: {
          id: 'learn_1_2',
          persona: {
            name: 'Maria Chen',
            role: 'CEO & Co-Founder',
            company: 'NeuralPath AI',
            background: '$800K ARR, healthcare diagnostics, Series A',
            context: 'LinkedIn message, warm intro from mutual connection',
          },
          situation:
            "Maria messages you on LinkedIn: 'Hey, I heard about GetDeal.ai from a friend. We're a Series A AI startup doing $800K ARR in healthcare diagnostics. I'm not sure if we should talk to you or just hire a regular investment banker. What exactly do you guys do differently?'",
          difficulty: 2,
          timeLimitSeconds: 90,
          idealResponse:
            "Hey Maria \u2014 great question. Here's the short version: GetDeal.ai is a confidential M&A marketplace \u2014 we connect AI companies like yours with strategic acquirers and PE firms looking to buy, not VCs looking to fund.\n\nThe difference from a traditional banker?\n1. Confidentiality-first \u2014 your team won't know you're exploring\n2. AI-specific buyers \u2014 not generalists\n3. Success-fee only, no exclusivity \u2014 you pay nothing unless we help you close\n\nWorth a 30-minute confidential call to see if there's fit?",
          commonMistakes: [
            'Calling it a fundraising platform',
            'Not addressing confidentiality',
            'Being too salesy or desperate',
            'Forgetting to include a CTA',
          ],
        },
      },
      {
        id: '1.3',
        name: 'The Buyer Universe',
        lesson: {
          title: 'Know Your Buyers',
          content:
            'GetDeal.ai serves 5 buyer types: (1) Corporates \u2014 M&A/Corp Dev teams at F1000, (2) Private Equity \u2014 tech-focused PE doing add-ons, (3) Late-Stage VCs \u2014 seeking portfolio exits, (4) Family Offices \u2014 direct tech investment, (5) Funded Companies \u2014 $5M+ raised, doing acqui-hires.',
          keyPoints: [
            'Corporates: M&A teams, strategic acquisitions',
            'PE: Platform and add-on acquisitions, $1M-$50M',
            'Late-Stage VCs: Portfolio exit opportunities',
            'Family Offices: Direct investment in AI',
            'Funded Companies: Acqui-hires, tech acceleration',
          ],
        },
        scenario: {
          id: 'learn_1_3',
          persona: {
            name: 'James Whitfield',
            role: 'Head of Corporate Development',
            company: 'Meridian Financial Services',
            background: 'F500 company, $2B revenue, building AI capabilities',
            context: 'Cold email response, skeptical tone',
          },
          situation:
            "James replies to your cold outreach: 'Thanks for reaching out. We get pitched by deal sourcing platforms all the time. Most are just aggregators with no real vetting. What makes GetDeal.ai different? We have our own M&A team \u2014 why would we need you?'",
          difficulty: 3,
          timeLimitSeconds: 90,
          idealResponse:
            "Fair question \u2014 most platforms are aggregators. We're different because we're AI-specific and we vet deeply.\n\nFor corporate M&A teams, the value isn't replacing your team \u2014 it's extending your pipeline with off-market, pre-vetted AI assets. We handle technical DD (architecture, data moats, IP risks) so your team can focus on strategic fit.\n\nTypically saves 200+ hours per acquisition and surfaces opportunities your team wouldn't see otherwise.\n\nWant me to share a specific example of an AI company in your space that's currently on our platform?",
          commonMistakes: [
            'Getting defensive about the objection',
            "Not addressing the 'just aggregator' concern",
            'Forgetting to mention time savings',
            'Missing the CTA opportunity',
          ],
        },
      },
      {
        id: '1.4',
        name: 'The Seller Universe',
        lesson: {
          title: 'Know Your Sellers',
          content:
            "GetDeal.ai sellers are AI companies (Seed to Series B) seeking full exits or 20%+ stakes. They choose us for: confidentiality (team doesn't know), efficiency (we handle the process), expertise (AI-specific), and alignment (success-fee only).",
          keyPoints: [
            'Stage: Seed to Series B AI companies',
            'Transaction: Full acquisition or 20%+ stake',
            'Pain: Confidentiality, efficiency, expertise',
            'Fear: Team finding out, wasting time, wrong buyers',
            'Win: Right acquirer, fair valuation, founder-friendly process',
          ],
        },
        scenario: {
          id: 'learn_1_4',
          persona: {
            name: 'David Park',
            role: 'CEO & Founder',
            company: 'Quantum ML',
            background: 'Series A, $1.2M ARR, enterprise ML platform, 12 employees',
            context: 'Inbound inquiry via website, exploring options',
          },
          situation:
            "David submits an inquiry through your website: 'We're a Series A AI company with about $1.2M ARR. I'm starting to think about exit options but I'm worried about confidentiality \u2014 if my team finds out I'm exploring, it could cause panic. Also, I've heard horror stories about founders getting lowballed. How does your process work and how do you protect sellers?'",
          difficulty: 2,
          timeLimitSeconds: 120,
          idealResponse:
            "David \u2014 those are exactly the right questions to ask, and they're concerns we hear from most founders.\n\nOn confidentiality: It's core to how we operate. Your listing starts as an anonymized teaser \u2014 buyers see the opportunity without your company name. Only after they sign an NDA and we confirm mutual interest do we reveal identity. Your team never needs to know.\n\nOn valuation: We match you with multiple qualified buyers simultaneously. Competition drives fair pricing. And we don't require exclusivity \u2014 you keep your options open.\n\nProcess is simple: Initial consultation \u2192 we vet and build your profile \u2192 matched to relevant buyers \u2192 introductions \u2192 you decide who to engage.\n\nFee: Success-fee only. You pay nothing unless we help you close.\n\nWant to schedule a confidential 30-minute call to discuss your specific situation?",
          commonMistakes: [
            "Not addressing confidentiality first (it's his main concern)",
            'Being vague about the process',
            'Not explaining how competition protects valuation',
            'Sounding too salesy given his concerns',
          ],
        },
      },
    ],
  },
};
