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

export interface UserProfile {
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  sleepHours: number;
  activityLevel: ActivityLevel;
  smoker: boolean;
  cigarettesPerDay?: number;
  alcoholDrinksPerWeek: number;
  dietQuality: DietQuality;
}

export interface SimulationResponse {
  markdownReport: string;
  suggestedAction: string;
  healthScoreCurrent: number;
  healthScoreFuture: number;
  organHighlights: string[]; // e.g., ['liver', 'heart']
}

export type StepField = 
  | 'basic'
  | 'body'
  | 'lifestyle_1' // Sleep & Activity
  | 'lifestyle_2' // Smoking & Alcohol
  | 'diet';

export const STEPS: StepField[] = ['basic', 'body', 'lifestyle_1', 'lifestyle_2', 'diet'];
