import { GoogleGenAI } from "@google/genai";
import { UserProfile, SimulationResponse, Gender, ActivityLevel, DietQuality, FastFoodFrequency } from "../types";

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
  if (p.activityLevel === ActivityLevel.Sedentary || p.activityLevel === ActivityLevel.Light) {
    score += 2;
  }
  
  // 5. Diet
  if (p.dietQuality === DietQuality.Poor) {
    score += 1;
  }

  if (p.existingConditions.includes("Hypertension")) score += 2;

  return score;
};

// Simplified CVD Risk Proxy
const calculateCVDRiskProxy = (p: UserProfile, bmi: number) => {
  let riskScore = 1.0; 

  if (p.age > 40) riskScore += (p.age - 40) * 0.2;
  if (p.gender === Gender.Male) riskScore *= 1.3;
  if (p.smoker) riskScore *= 2.0;

  if (bmi > 30) riskScore *= 1.5;
  else if (bmi > 25) riskScore *= 1.2;

  if (p.existingConditions.includes("Hypertension")) riskScore *= 1.5;
  if (p.existingConditions.includes("Type 2 Diabetes")) riskScore *= 2.0;
  if (p.existingConditions.includes("High Cholesterol")) riskScore *= 1.3;

  if (p.activityLevel === ActivityLevel.Sedentary) riskScore *= 1.2;

  return Math.min(99, Number(riskScore.toFixed(1)));
};

// Health Score (0-100)
const calculateHealthScore = (p: UserProfile, bmi: number, smoker: boolean) => {
  let score = 100;
  score -= (p.age - 20) * 0.3; 
  if (bmi > 30) score -= 15;
  else if (bmi > 25) score -= 5;
  if (smoker) score -= 20;

  if (p.activityLevel === ActivityLevel.Sedentary) score -= 10;
  else if (p.activityLevel === ActivityLevel.Active) score += 5;

  score -= (p.existingConditions.length * 10);

  if (p.sleepHours < 6) score -= 5;

  return Math.max(10, Math.min(100, Math.round(score)));
};


// --- NEW DETERMINISTIC CALCULATIONS (A1-A6) ---

const calcStepsCategory = (steps: number) => {
  if (steps < 5000) return "sedentary_lifestyle_index";
  if (steps < 7500) return "low_active";
  if (steps < 10000) return "somewhat_active";
  if (steps < 12500) return "active";
  return "highly_active";
};

const calcActivityGuidelines = (steps: number) => {
  const mvpaProxy = Math.round((steps / 100) * 7); // 100 steps approx 1 min MVPA assumption
  const meetsBySteps = steps >= 8000;
  const meetsByProxy = mvpaProxy >= 150;
  return {
    dailySteps: steps,
    mvpaMinutesProxyPerWeek: mvpaProxy,
    meetsGuidelineBySteps: meetsBySteps,
    meetsGuidelineByProxyMinutes: meetsByProxy,
    overallMeetsMinimumGuideline: meetsBySteps || meetsByProxy,
    additionalBenefitsTierReached: mvpaProxy >= 300 || steps >= 11000
  };
};

const calcSedentaryRisk = (hours: number) => {
  if (hours < 6) return "low";
  if (hours < 8) return "moderate";
  if (hours < 10) return "high";
  return "very_high";
};

const calcAlcoholRisk = (drinksPerWeek: number, sex: string, maxDrinks?: number) => {
  const isMale = sex === Gender.Male;
  const heavyThreshold = isMale ? 15 : 8;
  const heavyDrinkingFlag = drinksPerWeek >= heavyThreshold;
  
  let riskLevel = "none";
  if (drinksPerWeek > 0) riskLevel = heavyDrinkingFlag ? "high" : "elevated";

  // Binge logic
  let bingeFlag = false;
  if (maxDrinks !== undefined) {
    const bingeThreshold = isMale ? 5 : 4;
    bingeFlag = maxDrinks >= bingeThreshold;
  }

  // Elevate if binge
  if (bingeFlag && riskLevel !== "high") riskLevel = "high";

  return { heavyDrinkingFlag, riskLevel, bingeFlag };
};

const calcSmokingRisk = (p: UserProfile) => {
  if (!p.smoker) {
    return {
      riskLevel: "low",
      packYears: 0,
      lungCancerScreeningEligible: (p.age >= 50 && p.age <= 80 && (p.yearsSinceQuit || 0) <= 15 && (p.yearsSmoked || 0) * ((p.cigarettesPerDay || 0)/20) >= 20)
    };
  }

  const packsPerDay = (p.cigarettesPerDay || 0) / 20;
  const packYears = Number((packsPerDay * (p.yearsSmoked || 0)).toFixed(1));
  
  let riskLevel = "moderate";
  if (packYears >= 20) riskLevel = "high";

  const eligible = p.age >= 50 && p.age <= 80 && packYears >= 20;
  
  return { riskLevel, packYears, lungCancerScreeningEligible: eligible };
};

const calcDietScore = (quality: DietQuality, fastFood: FastFoodFrequency) => {
  // Map Inputs to 1-5 Scale roughly
  let qVal = 3;
  if (quality === DietQuality.Poor) qVal = 1;
  if (quality === DietQuality.Average) qVal = 3;
  if (quality === DietQuality.Good) qVal = 5;

  let ffVal = 3;
  if (fastFood === FastFoodFrequency.Never) ffVal = 1;
  if (fastFood === FastFoodFrequency.Rarely) ffVal = 2;
  if (fastFood === FastFoodFrequency.Weekly) ffVal = 3;
  if (fastFood === FastFoodFrequency.Frequent) ffVal = 5;

  // Formula: baseFromDietQuality - fastFoodPenalty
  // base: 1->20, 2->40, 3->60, 4->80, 5->100
  const base = qVal * 20;
  
  // penalty: 1->0, 2->5, 3->15, 4->25, 5->35
  const penalties = [0, 0, 5, 15, 25, 35];
  const penalty = penalties[ffVal];

  const score = Math.max(0, Math.min(100, base - penalty));
  
  let level = "very_high";
  if (score >= 80) level = "low";
  else if (score >= 60) level = "moderate";
  else if (score >= 40) level = "high";

  return { score, level, qVal, ffVal };
};


const SYSTEM_INSTRUCTION = `
You are "See Your Future Health", a health interpretation engine.

COMMUNICATION & TRANSPARENCY RULES (STRICT):
1. Do NOT say "I simulated...", "I ran complex simulations", "I accessed biobank data", or "My AI model predicted...".
2. Any explanatory phrasing MUST be placed ONLY inside JSON string fields (e.g., summary, interpretation). Never output any text outside the JSON object. Return JSON only.
3. Do NOT invent numbers. If a value is missing in the prompt, state that it is missing.
4. Do NOT increase numeric precision (e.g., if input is 12%, do not output 12.34%).
5. THIS IS NOT A DIAGNOSIS. Always imply these are statistical estimates based on averages.

**Output Structure (JSON):**
Return a JSON object strictly matching this schema. You must MERGE the PRE-CALCULATED risk cards into your output.

{
  "riskCards": [
    {
      "id": "string (e.g. 'diabetes', 'physical_activity')",
      "title": "Title",
      "organ": "Organ Name",
      "riskLevel": "low|moderate|high|very_high", 
      "probability": <NUMBER: Use provided probability or map riskLevel to 5/30/60/90>,
      "probabilityLabel": "Low/Moderate/High",
      "summary": "Plain language explanation of the score.",
      "facts": ["Fact 1", "Fact 2"],
      "recommendedActions": ["Action 1", "Action 2"],
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
  ],
  "additionalMetrics": <Include the provided additionalMetrics object exactly>,
  "debugCalculations": <Include the provided debugCalculations object exactly>,
  "scenarios": {
    "baselineAssumptions": "string",
    "definitions": {
      "status_quo": "string",
      "small_changes": "string",
      "big_changes": "string"
    },
    "items": [
      {
        "id": "status_quo|small_changes|big_changes",
        "label": "string",
        "modifiedInputs": [
          {
            "field": "string",
            "from": "number|string|boolean|null",
            "to": "number|string|boolean|null",
            "note": "string"
          }
        ],
        "projected": {
          "healthScoreTrajectory": [{ "age": 30, "value": 80 }],
          "weightTrajectory": [{ "age": 30, "value": 75, "unit": "kg" }],
          "riskCardDeltaSummary": [
            {
              "riskCardId": "string",
              "fromRiskLevel": "low|moderate|high|very_high|insufficient_data",
              "toRiskLevel": "low|moderate|high|very_high|insufficient_data",
              "whyChanged": "string"
            }
          ]
        },
        "uncertainty": {
          "level": "low|medium|high",
          "band": {
            "healthScore": { "minus": 0, "plus": 0, "unit": "points" },
            "weight": { "minus": 0, "plus": 0, "unit": "kg" }
          },
          "reasons": ["string"]
        },
        "topDrivers": [
          {
            "driverId": "string",
            "label": "string",
            "direction": "improves|worsens",
            "estimatedImpact": { "points": 0, "unit": "health_score_points" },
            "evidenceNote": "string"
          }
        ],
        "milestones": [
          {
            "age": 0,
            "type": "threshold_crossed|guideline_met|risk_reduced|risk_increased",
            "title": "string",
            "detail": "string"
          }
        ]
      }
    ]
  },
  "chartSpecs": [
    {
      "id": "string",
      "type": "stacked_contribution_bar|bullet_target|timeline_milestones",
      "title": "string",
      "subtitle": "string",
      "description": "string",
      "data": "ANY (Array or Object depending on type)",
      "axes": { "x": { "label": "string", "unit": "string" }, "y": { "label": "string", "unit": "string" } },
      "tooltips": { "enabled": true, "template": "string" },
      "thresholds": [{ "label": "string", "from": 0, "to": 100, "unit": "string", "color": "string" }],
      "sources": [{ "title": "string", "url": "string" }]
    }
  ]
}

**SCENARIO RULES (Follow Strictly):**
1. **status_quo**: No behavior changes. Reflect current trajectory.
2. **small_changes**: Pick 2–3 realistic adjustments based on available user fields (e.g., +steps, -sitting, reduce alcohol, improve diet rating).
3. **big_changes**: Pick stronger but plausible adjustments. If smoker, include cessation if fields allow.
4. **Uncertainty**: If multiple fields missing or habits unknown, level MUST be "high". List reasons.
5. **Top Drivers**: 3–6 drivers explaining the difference. Keep impacts conservative.
6. **Milestones**: 4–10 entries per scenario (e.g., "Meets activity guideline", "Risk threshold avoided"). Do not invent labs.

**CHART SPEC RULES (Follow Strictly):**
1. **stacked_contribution_bar**: For each MAJOR risk card (Diabetes, CVD, etc.), break down the calculated risk/probability into 4-8 named contributors (e.g., "Age", "BMI", "Inactivity", "Diet"). 
   - Weights must be heuristic estimates based on standard risk models (e.g., FINDRISC) but must sum to the probability or 100%.
   - Data Structure: [{ "label": "Age", "value": 20, "color": "#..." }, ...]
2. **bullet_target**: Create for 'steps', 'sitting', 'alcohol', 'sleep'.
   - Include thresholds/targets clearly labeled (e.g., 'Minimum', 'Optimal').
   - Data Structure: { "current": 5000, "target": 10000, "min": 0, "max": 20000, "ranges": [{ "label": "Sedentary", "max": 5000 }, ...] }
   - **Citations**: If you reference a guideline target, include sources with authoritative links in the 'sources' field.
3. **timeline_milestones**: Create one for each scenario ID.
   - Data must be directly derived from "scenarios.items[].milestones".
   - Data Structure: Array of milestone objects.

**MANDATORY SOURCE MAPPINGS (Do not deviate):**
- Physical Activity: "WHO physical activity recommendations" (https://www.who.int/initiatives/behealthy/physical-activity)
- Steps/Sedentary: "Tudor-Locke et al. Pedometer Indices" (https://pubmed.ncbi.nlm.nih.gov/14715035/)
- Alcohol: "WHO Europe: No safe level" (https://www.who.int/europe/news/item/04-01-2023-no-level-of-alcohol-consumption-is-safe-for-our-health)
- Smoking: "CDC Benefits of Quitting" (https://www.cdc.gov/tobacco/about/benefits-of-quitting.html)
- Diet: "WHO Healthy Diet" (https://www.who.int/news-room/fact-sheets/detail/healthy-diet)
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

    // --- New Deterministic Logic ---
    const stepsCat = calcStepsCategory(profile.dailySteps);
    const activityInfo = calcActivityGuidelines(profile.dailySteps);
    const sedentaryRisk = calcSedentaryRisk(profile.sittingHours);
    const alcoholInfo = calcAlcoholRisk(profile.alcoholDrinksPerWeek, profile.gender, profile.maxDrinksPerOccasion);
    const smokingInfo = calcSmokingRisk(profile);
    const dietInfo = calcDietScore(profile.dietQuality, profile.fastFoodFrequency);

    // FINDRISC Probability Mapping
    let diabetesProb = 1;
    if (findriscScore >= 7 && findriscScore <= 11) diabetesProb = 4;
    else if (findriscScore >= 12 && findriscScore <= 14) diabetesProb = 17;
    else if (findriscScore >= 15 && findriscScore <= 20) diabetesProb = 33;
    else if (findriscScore > 20) diabetesProb = 50;

    const additionalMetrics = {
        physicalActivity: {
            ...activityInfo,
            stepsCategory: stepsCat,
            guidelineTargets: { minimumModerateMinutesPerWeek:150, additionalModerateMinutesPerWeek:300, muscleStrengthDaysPerWeek:2 }
        },
        sedentary: {
            sittingHours: profile.sittingHours,
            riskLevel: sedentaryRisk
        },
        alcohol: {
            weeklyDrinks: profile.alcoholDrinksPerWeek,
            ...alcoholInfo
        },
        smoking: {
            ...smokingInfo,
            cigarettesPerDay: profile.cigarettesPerDay,
            yearsSmoked: profile.yearsSmoked
        },
        diet: {
            score: dietInfo.score,
            level: dietInfo.level
        }
    };

    const debugCalculations = {
        stepsCategory: { inputs: profile.dailySteps, result: stepsCat },
        sedentary: { inputs: profile.sittingHours, result: sedentaryRisk },
        diet: { inputs: {q: dietInfo.qVal, ff: dietInfo.ffVal}, formula: "base - penalty", result: dietInfo.score }
    };

    const prompt = `
      Analyze this profile using the PROVIDED CALCULATED METRICS. 
      
      User Profile:
      - Age: ${profile.age}, Sex: ${profile.gender}
      - BMI: ${bmi}, WHR: ${whr}
      - Daily Steps: ${profile.dailySteps}
      - Sitting: ${profile.sittingHours} hrs/day
      - Alcohol: ${profile.alcoholDrinksPerWeek} drinks/wk (Max per occasion: ${profile.maxDrinksPerOccasion})
      - Smoker: ${profile.smoker} (Years: ${profile.yearsSmoked}, Cigs/day: ${profile.cigarettesPerDay})
      - Years Since Quit: ${profile.yearsSinceQuit}
      
      **APP CALCULATED METRICS (Must use these):**
      1. FINDRISC (Diabetes): ${findriscScore}/26 (${diabetesProb}%)
      2. CVD Risk Proxy: ${cvdRiskPercent}%
      3. Bio-Vitality Score: ${currentHealthScore}/100
      
      **DETERMINISTIC RISK DATA (Insert these as Risk Cards):**
      - Physical Activity Risk: ${activityInfo.overallMeetsMinimumGuideline ? "Low" : "High"} (Steps Category: ${stepsCat})
      - Sedentary Risk: ${sedentaryRisk}
      - Alcohol Risk: ${alcoholInfo.riskLevel} (Binge Flag: ${alcoholInfo.bingeFlag})
      - Smoking Risk: ${smokingInfo.riskLevel} (Pack Years: ${smokingInfo.packYears})
      - Diet Quality Score: ${dietInfo.score}/100 (Level: ${dietInfo.level})

      **Instructions:**
      - Generate a JSON response.
      - Create standard cards for Diabetes and CVD using the probabilities above.
      - CREATE SPECIFIC CARDS for: "Physical Activity", "Sedentary Behavior", "Alcohol Use", "Tobacco Exposure", and "Diet Quality".
      - For these specific cards, use the 'Risk Level' calculated above.
      - Use the MANDATORY SOURCE MAPPINGS provided in system instructions for these cards.
      - Include 'additionalMetrics' and 'debugCalculations' objects provided below exactly as is.
      - Generate 'scenarios' and 'chartSpecs' as per the schema rules.
      
      additionalMetrics: ${JSON.stringify(additionalMetrics)}
      debugCalculations: ${JSON.stringify(debugCalculations)}
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

    function extractJson(text: string): string {
      const t = text.trim();

      // 1) Prefer fenced ```json ... ``` blocks
      const fenced = t.match(/```json\s*([\s\S]*?)\s*```/i);
      if (fenced?.[1]) return fenced[1].trim();

      // 2) Then any fenced ``` ... ``` block
      const anyFence = t.match(/```\s*([\s\S]*?)\s*```/);
      if (anyFence?.[1]) return anyFence[1].trim();

      // 3) Fallback: take substring from first '{' to last '}' (common when model adds preface)
      const firstObj = t.indexOf("{");
      const lastObj = t.lastIndexOf("}");
      if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
        return t.slice(firstObj, lastObj + 1).trim();
      }

      // 4) Fallback: try array JSON
      const firstArr = t.indexOf("[");
      const lastArr = t.lastIndexOf("]");
      if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
        return t.slice(firstArr, lastArr + 1).trim();
      }

      throw new Error("NO_JSON_FOUND");
    }

    // ...

    const rawText = response.text;
    if (!rawText) throw new Error("NO_TEXT_FROM_GEMINI");

    let parsed: any;
    try {
      const jsonStr = extractJson(rawText);
      parsed = JSON.parse(jsonStr);
    } catch (e: any) {
      console.error("Gemini raw response (first 1200 chars):", rawText.slice(0, 1200));

      // Distinguish parse vs actual network/api issues
      const msg =
        e?.name === "SyntaxError"
          ? "AI_RESPONSE_NOT_JSON"
          : e?.message === "NO_JSON_FOUND"
            ? "AI_RESPONSE_NO_JSON_BLOCK"
            : "AI_RESPONSE_PARSE_FAILED";

      throw new Error(msg);
    }

    return parsed;


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