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
}

export type StepField = 
  | 'basic'
  | 'body'
  | 'activity' 
  | 'habits' 
  | 'medical' 
  | 'diet';

export const STEPS: StepField[] = ['basic', 'body', 'activity', 'habits', 'medical', 'diet'];