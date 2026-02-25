// Table row types (mirroring InsForge database schemas)
export type {
  UserRow,
  AttemptRow,
  TrackProgressRow,
  SupportSessionRow,
  ScenarioSeenRow,
  LeadRegistryRow,
  LeadActivityRow,
  LeadAssignmentRow,
  CasebookRow,
  UserMemoryRow,
  GeneratedScenarioRow,
  EngagementPlanStep,
  ScenarioPersona,
  ScoringRubric,
} from './tables';

// Enum-like string literal types
export type {
  TrackStatus,
  AttemptMode,
  LeadStatus,
  LeadActivityType,
  LLMProvider,
  InputType,
  ScenarioSourceType,
  Difficulty,
} from './enums';

// Game constants
export {
  XP_PER_LEVEL,
  RANK_TITLES,
  PASSING_SCORE,
  MAX_STREAK_BONUS_XP,
  LEAD_STATUSES,
  DIFFICULTY_LABELS,
  MAX_LEVEL,
  getRankTitle,
  getXPForNextLevel,
} from './constants';
