export enum Gender {
  Male = "Male",
  Female = "Female",
  Other = "Other"
}

export enum ActivityLevel {
  Sedentary = "Sedentary (Office job, little exercise)",
  Light = "Light (1-2 days/week)",
  Moderate = "Moderate (3-5 days/week)",
  Active = "Active (6-7 days/week)"
}

export enum DietQuality {
  Poor = "Heavy processed foods/sugar",
  Average = "Balanced but occasional junk",
  Good = "Whole foods, fruits, vegetables"
}

export enum FastFoodFrequency {
  Never = "Never",
  Rarely = "1-2x per month",
  Weekly = "1-2x per week",
  Frequent = "3+ times per week"
}

export interface UserProfile {
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  waistCm: number;
  hipCm: number;
  
  // Detailed metrics
  dailySteps: number;
  sittingHours: number;
  existingConditions: string[];
  
  sleepHours: number;
  activityLevel: ActivityLevel;
  
  // Habits
  smoker: boolean;
  cigarettesPerDay?: number;
  yearsSmoked?: number;      // New
  yearsSinceQuit?: number;   // New
  
  alcoholDrinksPerWeek: number;
  maxDrinksPerOccasion?: number; // New (for binge flag)
  
  dietQuality: DietQuality;
  fastFoodFrequency: FastFoodFrequency;
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface RiskCard {
  id?: string; // New
  title: string;
  organ?: string; // Optional now as some cards are systemic
  riskLevel?: string; // New
  probability: number; // 0-100 (Legacy support)
  probabilityLabel: string; 
  summary: string;
  facts?: string[];
  recommendedActions?: string[]; // New
  sources: SourceLink[];
}

export interface TrajectoryPoint {
  age: number;
  score: number;
}

export interface WeightPoint {
  age: number;
  weight: number;
}

export interface DiseasePrediction {
  condition: string;
  onsetAge: number;
}

// --- New Scenario Types ---

export interface ScenarioModifiedInput {
  field: string;
  from: number | string | boolean | null;
  to: number | string | boolean | null;
  note: string;
}

export interface ScenarioRiskDelta {
  riskCardId: string;
  fromRiskLevel: "low" | "moderate" | "high" | "very_high" | "insufficient_data";
  toRiskLevel: "low" | "moderate" | "high" | "very_high" | "insufficient_data";
  whyChanged: string;
}

export interface ScenarioUncertainty {
  level: "low" | "medium" | "high";
  band: {
    healthScore: { minus: number; plus: number; unit: "points" };
    weight: { minus: number; plus: number; unit: "kg" };
  };
  reasons: string[];
}

export interface ScenarioDriver {
  driverId: string;
  label: string;
  direction: "improves" | "worsens";
  estimatedImpact: { points: number; unit: "health_score_points" };
  evidenceNote: string;
}

export interface ScenarioMilestone {
  age: number;
  type: "threshold_crossed" | "guideline_met" | "risk_reduced" | "risk_increased";
  title: string;
  detail: string;
}

export interface ScenarioItem {
  id: "status_quo" | "small_changes" | "big_changes";
  label: string;
  modifiedInputs: ScenarioModifiedInput[];
  projected: {
    healthScoreTrajectory: Array<{ age: number; value: number }>;
    weightTrajectory: Array<{ age: number; value: number; unit: "kg" }>;
    riskCardDeltaSummary: ScenarioRiskDelta[];
  };
  uncertainty: ScenarioUncertainty;
  topDrivers: ScenarioDriver[];
  milestones: ScenarioMilestone[];
}

export interface ScenariosData {
  baselineAssumptions: string;
  definitions: {
    status_quo: string;
    small_changes: string;
    big_changes: string;
  };
  items: ScenarioItem[];
}

// --- New Chart Spec Types ---

export type ChartType = "stacked_contribution_bar" | "bullet_target" | "timeline_milestones";

export interface ChartThreshold {
  label: string;
  from?: number;
  to?: number;
  unit?: string;
  color?: string; 
}

export interface ChartSpec {
  id: string;
  type: ChartType;
  title: string;
  subtitle?: string;
  description: string;
  data: any; 
  axes?: {
    x?: { label: string; unit?: string };
    y?: { label: string; unit?: string };
  };
  tooltips: {
    enabled: true;
    template: string;
  };
  thresholds?: ChartThreshold[];
  sources?: SourceLink[];
}

// --------------------------

export interface SimulationResponse {
  riskCards: RiskCard[];
  suggestedAction: string;
  healthScoreCurrent: number;
  healthScoreFuture: number;
  lifeExpectancy: number;
  predictedConditions: DiseasePrediction[];
  organHighlights: string[];
  trajectory: TrajectoryPoint[];
  bmiTrajectory?: TrajectoryPoint[];
  weightTrajectory: WeightPoint[];
  
  // New deterministic sections
  additionalMetrics?: any;
  debugCalculations?: any;

  // New Scenarios
  scenarios?: ScenariosData;
  
  // New Chart Specs
  chartSpecs?: ChartSpec[];
}

export type StepField = 
  | 'basic'
  | 'body'
  | 'activity' 
  | 'habits' 
  | 'medical' 
  | 'diet';

export const STEPS: StepField[] = ['basic', 'body', 'activity', 'habits', 'medical', 'diet'];