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
  waistCm: number; // New
  hipCm: number;   // New
  
  // New detailed metrics
  dailySteps: number;
  sittingHours: number;
  existingConditions: string[];
  
  sleepHours: number;
  activityLevel: ActivityLevel;
  smoker: boolean;
  cigarettesPerDay?: number;
  alcoholDrinksPerWeek: number;
  dietQuality: DietQuality;
  fastFoodFrequency: FastFoodFrequency;
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface RiskCard {
  title: string;
  organ: string;
  probability: number; // 0-100
  probabilityLabel: string; // e.g., "High Risk", "Below Average"
  summary: string; // The "Shiny sentence"
  facts: string[]; // Bullet points
  sources: SourceLink[];
}

export interface TrajectoryPoint {
  age: number;
  score: number; // 0-100 Health Score
}

export interface WeightPoint {
  age: number;
  weight: number; // in kg
}

export interface DiseasePrediction {
  condition: string;
  onsetAge: number; // e.g. 58
}

export interface SimulationResponse {
  riskCards: RiskCard[];
  suggestedAction: string;
  healthScoreCurrent: number;
  healthScoreFuture: number;
  lifeExpectancy: number; // New: e.g. 78
  predictedConditions: DiseasePrediction[];
  organHighlights: string[]; // e.g., ['liver', 'heart']
  trajectory: TrajectoryPoint[]; // Health Score
  bmiTrajectory?: TrajectoryPoint[]; // BMI over time
  weightTrajectory: WeightPoint[]; // New: Weight over time
}

export type StepField = 
  | 'basic'
  | 'body'
  | 'activity' // Steps & Sitting
  | 'habits' // Sleep, Smoke, Alcohol, Fast Food
  | 'medical' // Conditions
  | 'diet';

export const STEPS: StepField[] = ['basic', 'body', 'activity', 'habits', 'medical', 'diet'];