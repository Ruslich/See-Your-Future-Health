import { GoogleGenAI } from "@google/genai";
import { UserProfile, SimulationResponse, Gender, ActivityLevel, DietQuality } from "../types";

// --- Metric Calculators (Deterministic) ---

const calculateBMI = (h: number, w: number) => {
  const hm = h / 100;
  return Number((w / (hm * hm)).toFixed(1));
};

const calculateWHR = (waist: number, hip: number) => {
  return Number((waist / hip).toFixed(2));
};

// Simplified FINDRISC (Finnish Diabetes Risk Score)
const calculateFindrisc = (p: UserProfile, bmi: number) => {
  let score = 0;
  
  // 1. Age
  if (p.age >= 45 && p.age <= 54) score += 2;
  else if (p.age >= 55 && p.age <= 64) score += 3;
  else if (p.age > 64) score += 4;
  
  // 2. BMI
  if (bmi >= 25 && bmi <= 30) score += 1;
  else if (bmi > 30) score += 3;
  
  // 3. Waist Circumference
  if (p.gender === Gender.Male) {
    if (p.waistCm >= 94 && p.waistCm <= 102) score += 3;
    else if (p.waistCm > 102) score += 4;
  } else {
    if (p.waistCm >= 80 && p.waistCm <= 88) score += 3;
    else if (p.waistCm > 88) score += 4;
  }
  
  // 4. Physical Activity ( < 4h/week considered 'No')
  // Mapping: Sedentary & Light -> 'No' (2 points), Moderate & Active -> 'Yes' (0 points)
  if (p.activityLevel === ActivityLevel.Sedentary || p.activityLevel === ActivityLevel.Light) {
    score += 2;
  }
  
  // 5. Diet (Vegetables/Fruit daily)
  // Mapping: Poor -> 'No' (1 point), Good/Average -> 'Yes' (0 points - assuming Average eats some)
  if (p.dietQuality === DietQuality.Poor) {
    score += 1; // Actually FINDRISC gives 1 point for not eating veggies daily
  }

  // 6. Meds for HBP (Not asked, assume 0)
  if (p.existingConditions.includes("Hypertension")) score += 2;

  // 7. History of high glucose (Not asked, assume 0)
  
  // 8. Family History (Not asked, assume 0)

  return score;
};

// Simplified CVD Risk Proxy (Roughly inspired by risk factors, NOT valid QRISK3)
const calculateCVDRiskProxy = (p: UserProfile, bmi: number) => {
  let riskScore = 1.0; // Base 1% 10y risk

  // Age factor
  if (p.age > 40) riskScore += (p.age - 40) * 0.2;

  // Gender
  if (p.gender === Gender.Male) riskScore *= 1.3;

  // Smoking
  if (p.smoker) riskScore *= 2.0;

  // BMI
  if (bmi > 30) riskScore *= 1.5;
  else if (bmi > 25) riskScore *= 1.2;

  // Conditions
  if (p.existingConditions.includes("Hypertension")) riskScore *= 1.5;
  if (p.existingConditions.includes("Type 2 Diabetes")) riskScore *= 2.0;
  if (p.existingConditions.includes("High Cholesterol")) riskScore *= 1.3;

  // Activity
  if (p.activityLevel === ActivityLevel.Sedentary) riskScore *= 1.2;

  // Cap at 99
  return Math.min(99, Number(riskScore.toFixed(1)));
};

// Health Score (0-100)
const calculateHealthScore = (p: UserProfile, bmi: number, smoker: boolean) => {
  let score = 100;
  
  // Age decay
  score -= (p.age - 20) * 0.3; 

  // BMI penalty
  if (bmi > 30) score -= 15;
  else if (bmi > 25) score -= 5;

  // Smoker penalty
  if (smoker) score -= 20;

  // Activity
  if (p.activityLevel === ActivityLevel.Sedentary) score -= 10;
  else if (p.activityLevel === ActivityLevel.Active) score += 5;

  // Conditions
  score -= (p.existingConditions.length * 10);

  // Sleep
  if (p.sleepHours < 6) score -= 5;

  return Math.max(10, Math.min(100, Math.round(score)));
};


const SYSTEM_INSTRUCTION = `
You are "See Your Future Health", a health interpretation engine.

COMMUNICATION & TRANSPARENCY RULES (STRICT):
1. Do NOT say "I simulated...", "I ran complex simulations", "I accessed biobank data", or "My AI model predicted...".
2. INSTEAD use honest, transparent phrasing:
   - "This app uses established tools (like QRISK3 for heart disease and FINDRISC for diabetes) together with WHO BMI guidelines. I'm explaining the scores that were already computed for you."
   - "Based on the standard risk scores calculated..."
   - "Standard population data suggests..."
3. Do NOT invent numbers. If a value is missing in the prompt, state that it is missing.
4. Do NOT increase numeric precision (e.g., if input is 12%, do not output 12.34%).
5. THIS IS NOT A DIAGNOSIS. Always imply these are statistical estimates based on averages.

STYLE & TONE:
- Friendly, respectful, and non-judgmental.
- Avoid fear-mongering. Explain risk calmly.
- Suggestions should be practical (e.g., "Aim for 150 mins/week of moderate activity", "Reduce processed foods").

**Output Structure (JSON):**
Return a JSON object strictly matching this schema:
{
  "riskCards": [
    {
      "title": "Title (e.g. TYPE 2 DIABETES RISK)",
      "organ": "Organ Name",
      "probability": <NUMBER: Use the Provided Probability % in the prompt>,
      "probabilityLabel": "Low/Moderate/High",
      "summary": "Plain language explanation of the score.",
      "facts": ["Fact 1", "Fact 2"],
      "sources": [{"title": "Source Name", "url": "URL"}]
    }
  ],
  "suggestedAction": "One clear, actionable lifestyle change.",
  "healthScoreCurrent": <NUMBER: Use provided current score>,
  "healthScoreFuture": <NUMBER: Projected score in 10 years based on risk factors>,
  "lifeExpectancy": <NUMBER: Estimated age based on current health score>,
  "predictedConditions": [
    { "condition": "Condition Name", "onsetAge": <NUMBER: Conservative estimate> }
  ],
  "organHighlights": ["organ1", "organ2"],
  "trajectory": [
    {"age": 30, "score": 80},
    {"age": 40, "score": 75}
  ],
  "weightTrajectory": [
    {"age": 30, "weight": 75}
  ]
}
`;

export const generateHealthProjection = async (profile: UserProfile): Promise<SimulationResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // --- Perform Calculations in App ---
    const bmi = calculateBMI(profile.heightCm, profile.weightKg);
    const whr = calculateWHR(profile.waistCm, profile.hipCm);
    const findriscScore = calculateFindrisc(profile, bmi);
    const cvdRiskPercent = calculateCVDRiskProxy(profile, bmi);
    const currentHealthScore = calculateHealthScore(profile, bmi, profile.smoker);

    // FINDRISC Probability Mapping
    // 0-6: 1%, 7-11: 4%, 12-14: 17%, 15-20: 33%, >20: 50%
    let diabetesProb = 1;
    if (findriscScore >= 7 && findriscScore <= 11) diabetesProb = 4;
    else if (findriscScore >= 12 && findriscScore <= 14) diabetesProb = 17;
    else if (findriscScore >= 15 && findriscScore <= 20) diabetesProb = 33;
    else if (findriscScore > 20) diabetesProb = 50;

    const prompt = `
      Analyze this profile using the PROVIDED CALCULATED METRICS. 
      Do NOT recalculate. Interpret these numbers strictly.
      
      User Profile:
      - Age: ${profile.age}
      - Sex: ${profile.gender}
      - BMI: ${bmi}
      - Waist-to-Hip Ratio: ${whr}
      - Habits: ${profile.smoker ? "Smoker" : "Non-smoker"}, ${profile.activityLevel}
      
      **APP CALCULATED METRICS (Use these values):**
      1. FINDRISC Score (Diabetes): ${findriscScore}/26 (Approx probability: ${diabetesProb}%)
      2. CVD Risk Proxy (10-Year): ${cvdRiskPercent}%
      3. Current Bio-Vitality Score: ${currentHealthScore}/100
      
      Instructions:
      - Generate a JSON response matching the schema.
      - Map "FINDRISC" to a "Type 2 Diabetes" Risk Card.
      - Map "CVD Risk" to a "Cardiovascular" Risk Card.
      - Project the 'healthScoreFuture' (10 years from now) and 'trajectory' based on the decay implied by smoking/inactivity if present.
      - Project 'weightTrajectory' based on current BMI trends.
      
      Return ONLY the JSON object.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }] 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson) as SimulationResponse;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback response
    return {
      riskCards: [
        {
          title: "CONNECTION ERROR",
          organ: "network",
          probability: 0,
          probabilityLabel: "Error",
          summary: "Could not retrieve health data. Please try again.",
          facts: ["Check your internet connection."],
          sources: []
        }
      ],
      suggestedAction: "Retry Simulation",
      healthScoreCurrent: 0,
      healthScoreFuture: 0,
      lifeExpectancy: 0,
      predictedConditions: [],
      organHighlights: [],
      trajectory: [],
      weightTrajectory: [],
      bmiTrajectory: []
    };
  }
};

export const explainHealthInsight = async (
  profile: UserProfile, 
  context: string, 
  question: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are a helpful health assistant.
      User Profile Summary: Age ${profile.age}, ${profile.gender}, Weight ${profile.weightKg}kg.
      Context (Current Prediction): "${context}"
      
      User Question: "${question}"
      
      Provide a concise, scientific explanation (max 3 sentences). 
      Use the phrase "Based on standard risk models..." instead of claiming to run simulations.
      Do not invent numbers.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "I couldn't generate an explanation at this time.";
  } catch (e) {
    console.error(e);
    return "Connection error. Please try again.";
  }
};
