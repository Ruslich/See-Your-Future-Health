import { GoogleGenAI } from "@google/genai";
import { UserProfile, SimulationResponse, Gender, ActivityLevel, DietQuality, FastFoodFrequency, Le8Summary, Le8ComponentScore } from "../types";

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

// --- NEW MEASURED SCORING HELPERS ---

const calcBPScore = (p: UserProfile): { score: number, basis: "measured"|"self_report"|"unknown", label: string } => {
  // 1. Measured
  if (p.bp && p.bp.systolic && p.bp.diastolic) {
    const s = p.bp.systolic;
    const d = p.bp.diastolic;
    let score = 100;
    
    if (s >= 140 || d >= 90) score = 20;
    else if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) score = 50;
    else if ((s >= 120 && s <= 129) && d < 80) score = 80;
    else score = 100; // < 120 and < 80

    // Meds cap
    if (p.bp.onMeds && score > 80) score = 80;

    // Recency penalty
    if ((p.bp.measuredWithinMonths || 0) > 12) score = Math.max(0, score - 10);

    return { score, basis: "measured", label: `${s}/${d} mmHg` };
  }

  // 2. History Proxy
  if (p.existingConditions.includes("Hypertension")) {
    return { score: 30, basis: "self_report", label: "Hypertension History" };
  }

  // 3. Unknown
  return { score: 80, basis: "unknown", label: "No Diagnosis" };
};

const calcLipidsScore = (p: UserProfile): { score: number, basis: "measured"|"self_report"|"unknown", label: string } => {
  if (p.lipids && (p.lipids.totalChol || p.lipids.ldl)) {
    let score = 100;
    let label = "";

    // Prefer LDL
    if (p.lipids.ldl) {
      let ldl = p.lipids.ldl;
      if (p.lipids.unit === 'mmol_L') ldl = ldl * 38.67;
      
      label = `LDL: ${Math.round(ldl)}`;
      if (ldl >= 190) score = 10;
      else if (ldl >= 160) score = 30;
      else if (ldl >= 130) score = 50;
      else if (ldl >= 100) score = 80;
      else score = 100;
    } else if (p.lipids.totalChol) {
      let tc = p.lipids.totalChol;
      if (p.lipids.unit === 'mmol_L') tc = tc * 38.67;

      label = `Total: ${Math.round(tc)}`;
      if (tc >= 240) score = 20;
      else if (tc >= 200) score = 60;
      else score = 100;
    }

    if (p.lipids.onMeds && score > 80) score = 80;
    if ((p.lipids.measuredWithinMonths || 0) > 12) score = Math.max(0, score - 10);

    return { score, basis: "measured", label };
  }

  if (p.existingConditions.includes("High Cholesterol")) {
    return { score: 30, basis: "self_report", label: "History of High Chol." };
  }

  return { score: 80, basis: "unknown", label: "No Diagnosis" };
};

const calcGlucoseScore = (p: UserProfile): { score: number, basis: "measured"|"self_report"|"unknown", label: string } => {
  if (p.glucose && (p.glucose.a1c || p.glucose.fasting)) {
    let score = 100;
    let label = "";

    if (p.glucose.a1c) {
      label = `A1c: ${p.glucose.a1c}%`;
      if (p.glucose.a1c >= 6.5) score = 20;
      else if (p.glucose.a1c >= 5.7) score = 60;
      else score = 100;
    } else if (p.glucose.fasting) {
      let f = p.glucose.fasting;
      if (p.glucose.unit === 'mmol_L') f = f * 18;
      
      label = `Fasting: ${Math.round(f)}`;
      if (f >= 126) score = 20;
      else if (f >= 100) score = 60;
      else score = 100;
    }

    if (p.glucose.onMeds && score > 80) score = 80;
    if ((p.glucose.measuredWithinMonths || 0) > 12) score = Math.max(0, score - 10);

    return { score, basis: "measured", label };
  }

  if (p.existingConditions.includes("Type 2 Diabetes")) {
    return { score: 10, basis: "self_report", label: "Type 2 Diabetes" };
  }

  return { score: 80, basis: "unknown", label: "No Diagnosis" };
};


// --- AHA Life's Essential 8 Calculation ---

const calculateLe8Summary = (
  p: UserProfile, 
  bmi: number, 
  activityInfo: ReturnType<typeof calcActivityGuidelines>, 
  dietInfo: ReturnType<typeof calcDietScore>
): Le8Summary => {
  const components: Le8ComponentScore[] = [];
  const sourceAHA = { title: "AHA Life's Essential 8", url: "https://www.heart.org/en/healthy-living/healthy-lifestyle/lifes-essential-8" };
  const sourceSci = { title: "AHA LE8 Methodology", url: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001078" };

  // 1. Diet (Proxy)
  components.push({
    id: "diet",
    label: "Diet",
    score: dietInfo.score,
    basis: "proxy",
    note: "Approximation based on reported diet quality and fast food intake.",
    sources: [sourceAHA]
  });

  // 2. Physical Activity (Proxy)
  let paScore = 0;
  const mvpa = activityInfo.mvpaMinutesProxyPerWeek;
  if (mvpa >= 150) paScore = 100;
  else if (mvpa >= 90) paScore = 80;
  else if (mvpa >= 60) paScore = 60;
  else if (mvpa >= 30) paScore = 40;
  else if (mvpa >= 1) paScore = 20;
  else paScore = 0;
  
  components.push({
    id: "physical_activity",
    label: "Physical Activity",
    score: paScore,
    basis: "proxy",
    valueLabel: `${mvpa} min/wk (Est.)`,
    note: "Estimated from daily step count.",
    sources: [sourceAHA]
  });

  // 3. Nicotine Exposure
  let nicotineScore = 100;
  if (p.smoker) {
    nicotineScore = 0;
  } else {
    // Former smoker logic
    if (p.yearsSinceQuit !== undefined && p.yearsSinceQuit > 0) {
      if (p.yearsSinceQuit >= 5) nicotineScore = 100;
      else if (p.yearsSinceQuit >= 1) nicotineScore = 75;
      else nicotineScore = 50; // < 1 year
    } else if (p.yearsSmoked && p.yearsSmoked > 0 && !p.yearsSinceQuit) {
       // Just quit recently fallback
       nicotineScore = 50; 
    } else {
       // Never smoker
       nicotineScore = 100;
    }
  }
  components.push({
    id: "nicotine",
    label: "Nicotine Exposure",
    score: nicotineScore,
    basis: "self_report",
    valueLabel: p.smoker ? "Smoker" : (p.yearsSinceQuit ? `Quit ${p.yearsSinceQuit}y ago` : "Never Smoked"),
    sources: [sourceAHA]
  });

  // 4. Sleep Health
  let sleepScore = 100;
  const s = p.sleepHours;
  if (s >= 7 && s <= 9) sleepScore = 100;
  else if ((s >= 6 && s < 7) || (s > 9 && s < 10)) sleepScore = 70; // 9.9 is close to 10
  else if ((s >= 5 && s < 6) || (s >= 10 && s < 11)) sleepScore = 40;
  else sleepScore = 0; // < 5 or >= 11

  components.push({
    id: "sleep",
    label: "Sleep Health",
    score: sleepScore,
    basis: "self_report",
    valueLabel: `${s} hrs/night`,
    sources: [sourceAHA]
  });

  // 5. BMI
  let bmiScore = 100;
  if (bmi < 25) bmiScore = 100;
  else if (bmi < 30) bmiScore = 70;
  else if (bmi < 35) bmiScore = 40;
  else if (bmi < 40) bmiScore = 20;
  else bmiScore = 0;

  components.push({
    id: "bmi",
    label: "Body Mass Index",
    score: bmiScore,
    basis: "measured",
    valueLabel: `${bmi}`,
    sources: [sourceAHA]
  });

  // 6. Blood Lipids (Measured or Proxy)
  const lipids = calcLipidsScore(p);
  components.push({
    id: "blood_lipids",
    label: "Blood Lipids",
    score: lipids.score,
    basis: lipids.basis,
    valueLabel: lipids.label,
    sources: [sourceAHA, sourceSci]
  });

  // 7. Blood Glucose (Measured or Proxy)
  const glucose = calcGlucoseScore(p);
  components.push({
    id: "blood_glucose",
    label: "Blood Glucose",
    score: glucose.score,
    basis: glucose.basis,
    valueLabel: glucose.label,
    sources: [sourceAHA, sourceSci]
  });

  // 8. Blood Pressure (Measured or Proxy)
  const bp = calcBPScore(p);
  components.push({
    id: "blood_pressure",
    label: "Blood Pressure",
    score: bp.score,
    basis: bp.basis,
    valueLabel: bp.label,
    sources: [sourceAHA, sourceSci]
  });

  const totalScore = Math.round(components.reduce((acc, c) => acc + c.score, 0) / 8);
  
  // Confidence Logic
  const measuredOrSelf = components.filter(c => c.basis === "measured" || c.basis === "self_report").length;
  const unknownOrProxy = 8 - measuredOrSelf;
  
  let confidence: "low" | "medium" | "high" = "medium";
  // Updated confidence logic: if we have measurements for BP/Lipids/Glucose, confidence is High.
  const measuredVitals = components.filter(c => c.basis === "measured").length;
  
  if (measuredVitals >= 2) confidence = "high";
  else if (measuredOrSelf >= 6) confidence = "medium"; // Good self report data
  else confidence = "low";

  return {
    totalScore,
    components,
    dataCompleteness: { measuredCount: measuredOrSelf, proxyCount: unknownOrProxy, total: 8 },
    confidence
  };
};


// --- Helper to extract full text and avoid truncation ---
function getFullText(resp: any): string {
  if (!resp) return "";

  // Some SDKs expose a helper method
  const direct =
    typeof resp.text === "function" ? resp.text() :
    typeof resp.text === "string" ? resp.text :
    "";

  // Tool / grounded responses are often split into parts
  const partsText = (resp.candidates ?? [])
    .flatMap((c: any) => c?.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("");

  return (partsText || direct || "").trim();
}


const SYSTEM_INSTRUCTION = `
You are "See Your Future Health", a health interpretation engine.

COMMUNICATION & TRANSPARENCY RULES (STRICT):
1. Do NOT say "I simulated...", "I ran complex simulations", "I accessed biobank data", or "My AI model predicted...".
2. Any explanatory phrasing MUST be placed ONLY inside JSON string fields (e.g., summary, interpretation). Never output any text outside the JSON object. Return JSON only.
3. Do NOT invent numbers. If a value is missing in the prompt, state that it is missing.
4. Do NOT increase numeric precision (e.g., if input is 12%, do not output 12.34%).
5. THIS IS NOT A DIAGNOSIS. Always imply these are statistical estimates based on averages.
6. SCORING STANDARD: Use "AHA Life's Essential 8 (LE8) cardiovascular health score (estimated)" for all "health score" fields.
   - When explaining score changes, explicitly reference LE8 components (Sleep, Diet, Nicotine, etc).
   - Never claim lab measurements were taken; use the provided proxies.

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
  "healthScoreCurrent": <NUMBER: Use provided LE8 Total Score>,
  "healthScoreFuture": <NUMBER: Projected LE8 Score in 10 years based on risk factors>,
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

**TRAJECTORY DATA REQUIREMENTS (STRICT):**
- trajectory MUST contain 6–11 points (yearly) from current age to +10 years.
- trajectory.score represents the AHA LE8 Score (0-100).
- weightTrajectory MUST contain the SAME number of points and matching ages.
- Each weightTrajectory item must be: {"age": <number>, "weight": <number>} (kg).

**SCENARIO RULES (Follow Strictly):**
1. **status_quo**: No behavior changes. Reflect current trajectory.
2. **small_changes**: Pick 2–3 realistic adjustments based on available user fields (e.g., +steps, -sitting, reduce alcohol, improve diet rating).
3. **big_changes**: Pick stronger but plausible adjustments. If smoker, include cessation if fields allow.
4. **Uncertainty**: If multiple fields missing or habits unknown, level MUST be "high". List reasons.
5. **Top Drivers**: 3–6 drivers explaining the difference. Keep impacts conservative.
6. **Milestones**: 4–10 entries per scenario (e.g., "Meets activity guideline", "Risk threshold avoided"). Do not invent labs.

**PROJECTION RULES (CRITICAL):**
- If baseline BP/Lipids/Glucose values are PROVIDED (basis='measured'), do NOT project significant improvements unless the scenario explicitly improves behavior (weight loss, diet change). Even then, keep improvements conservative (<10% change).
- If baseline values are UNKNOWN (basis='unknown'/'proxy'), keep these components stable or slightly worsening with age in the status_quo scenario. Do NOT invent specific lab improvements in future scenarios if baseline is unknown.
- NEVER output a specific future BP (e.g., "120/80") if the user did not provide a starting BP. Discuss direction only.

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
- General Health Score: "AHA Life's Essential 8" (https://www.heart.org/en/healthy-living/healthy-lifestyle/lifes-essential-8)
`;

export const generateHealthProjection = async (profile: UserProfile): Promise<SimulationResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // --- Perform Calculations in App ---
    const bmi = calculateBMI(profile.heightCm, profile.weightKg);
    const whr = calculateWHR(profile.waistCm, profile.hipCm);
    const findriscScore = calculateFindrisc(profile, bmi);
    const cvdRiskPercent = calculateCVDRiskProxy(profile, bmi);
    
    // --- New Deterministic Logic ---
    const stepsCat = calcStepsCategory(profile.dailySteps);
    const activityInfo = calcActivityGuidelines(profile.dailySteps);
    const sedentaryRisk = calcSedentaryRisk(profile.sittingHours);
    const alcoholInfo = calcAlcoholRisk(profile.alcoholDrinksPerWeek, profile.gender, profile.maxDrinksPerOccasion);
    const smokingInfo = calcSmokingRisk(profile);
    const dietInfo = calcDietScore(profile.dietQuality, profile.fastFoodFrequency);

    // --- AHA LE8 Score ---
    const le8 = calculateLe8Summary(profile, bmi, activityInfo, dietInfo);
    const currentHealthScore = le8.totalScore;

    // FINDRISC Probability Mapping
    let diabetesProb = 1;
    if (findriscScore >= 7 && findriscScore <= 11) diabetesProb = 4;
    else if (findriscScore >= 12 && findriscScore <= 14) diabetesProb = 17;
    else if (findriscScore >= 15 && findriscScore <= 20) diabetesProb = 33;
    else if (findriscScore > 20) diabetesProb = 50;

    const additionalMetrics = {
        ahaLe8: le8,
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
        diet: { inputs: {q: dietInfo.qVal, ff: dietInfo.ffVal}, formula: "base - penalty", result: dietInfo.score },
        le8: { total: le8.totalScore, components: le8.components }
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
      
      **MEASURED VITALS (If provided):**
      - BP: ${profile.bp ? `${profile.bp.systolic}/${profile.bp.diastolic} (Meds: ${profile.bp.onMeds})` : "Not provided"}
      - Lipids: ${profile.lipids ? `LDL ${profile.lipids.ldl} (Meds: ${profile.lipids.onMeds})` : "Not provided"}
      - Glucose: ${profile.glucose ? `A1c ${profile.glucose.a1c}% (Meds: ${profile.glucose.onMeds})` : "Not provided"}

      **APP CALCULATED METRICS (Must use these):**
      1. FINDRISC (Diabetes): ${findriscScore}/26 (${diabetesProb}%)
      2. CVD Risk Proxy: ${cvdRiskPercent}%
      3. AHA LE8 Total Score (Estimated): ${currentHealthScore}/100
      
      **AHA LE8 Components:**
      ${JSON.stringify(le8.components)}
      
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
      - Use LE8 score as the main trajectory score in 'trajectory' array.
      - When explaining, reference AHA Life's Essential 8 and include links (heart.org page is enough).
      - Never claim lab measurements were taken if basis is 'proxy' or 'unknown'.
      
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

    const text = getFullText(response); // Use helper instead of direct property access
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

    const rawText = text; // Already extracted
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
      If you reference a guideline, cite one authoritative source (CDC, WHO, NIH, etc) if available.
      Use the Google Search tool if needed to verify facts from allowed authoritative domains.
      Allowed Domains: who.int, cdc.gov, nih.gov, ncbi.nlm.nih.gov, uspreventiveservicestaskforce.org, ahajournals.org, heart.org, thelancet.com, nejm.org, bmj.com, jamanetwork.com, nature.com, sciencedirect.com, cochranelibrary.com.
      Do not invent numbers.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });
    
    const out = getFullText(response);
    return out || "I couldn't generate an explanation at this time.";

  } catch (e) {
    console.error(e);
    return "Connection error. Please try again.";
  }
};

const CHAT_SYSTEM_INSTRUCTION = `
You are a specialized Health Assistant.
Answer ONLY using the provided CONTEXT PACK + (optional) evidence from allowed domains.

ALLOWED DOMAINS FOR WEB SEARCH (STRICT):
who.int, cdc.gov, nih.gov, ncbi.nlm.nih.gov, uspreventiveservicestaskforce.org,
heart.org, ahajournals.org, cochranelibrary.com, jamanetwork.com, nejm.org, bmj.com, thelancet.com

EVIDENCE RULES:
- You MAY use Google Search, but ONLY cite sources from the allowed domains above.
- If you can’t find a trustworthy numeric estimate from allowed domains, DO NOT invent it.
- Numeric claims MUST be in the EVIDENCE section and MUST end with [1], [2], etc.
- In SOURCES, list only the cited sources (same indices).

OUTPUT FORMAT (Plain Text Only, EXACT headings; NO markdown):

DIRECT ANSWER: <1–2 sentences, finish the thought.>

PERSONALIZED IMPACT
• <3–6 bullets. Each bullet MUST include at least 1 of the user’s metrics (BMI, WHR, steps, LE8 component scores).>
• <If user asks “what if I do X”, include how X would shift at least 2 of those metrics (conservatively).>

EVIDENCE
• <2–4 bullets. Each bullet: numeric estimate/range + what it means + MUST end with [n].>
• <If no numeric estimate found in allowed domains, write: “No strong numeric estimate found in allowed sources.”>

SOURCES:
[1] <Title> — <URL>
[2] <Title> — <URL>
(Include 1–4 sources max; omit SOURCES entirely if none)

HARD RULES:
- No diagnosis.
- Neutral tone (no shame).
- Never output unfinished sentences.
- Never invent studies, URLs, or numbers.
`;

export const chatWithHealthAssistant = async (
  profile: UserProfile,
  simulation: SimulationResponse,
  question: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Extract key metrics
    const bmi = calculateBMI(profile.heightCm, profile.weightKg);
    const whr = calculateWHR(profile.waistCm, profile.hipCm);
    
    // Additional metrics context
    const smoking = profile.smoker 
      ? `Smoker (${profile.cigarettesPerDay}/day, ~${simulation.additionalMetrics?.smoking?.packYears || 0} pack-years)` 
      : 'Non-smoker';
    
    const activity = `Steps: ${profile.dailySteps} (${simulation.additionalMetrics?.physicalActivity?.stepsCategory}), Sitting: ${profile.sittingHours}h/day, Sleep: ${profile.sleepHours}h`;
    const alcohol = `Alcohol: ${profile.alcoholDrinksPerWeek} drinks/wk (Binge: ${simulation.additionalMetrics?.alcohol?.bingeFlag ? 'Yes' : 'No'})`;
    const diet = simulation.additionalMetrics?.diet ? `DietScore: ${simulation.additionalMetrics.diet.score}/100` : '';
    
    // LE8 Context
    const le8 = simulation.additionalMetrics?.ahaLe8 as Le8Summary | undefined;
    const le8Breakdown = le8 ? le8.components.map(c => `${c.label}: ${c.score} (${c.valueLabel || c.basis})`).join(', ') : 'Not available';

    // Construct Context Pack
    const contextPack = `
      PROFILE: ${profile.age}y ${profile.gender}, BMI ${bmi}, WHR ${whr}
      METRICS: ${activity}, ${smoking}, ${alcohol}, ${diet}
      AHA LE8 SCORE: Current ${simulation.healthScoreCurrent} -> Future ${simulation.healthScoreFuture}
      LE8 BREAKDOWN: ${le8Breakdown}
      RISKS:
      ${simulation.riskCards.slice(0, 3).map(r => `- ${r.title} (${r.probability}%): ${r.riskLevel}`).join('\n')}
    `;

    // Construct Prompt
    const prompt = `
      CONTEXT PACK:
      ${contextPack}
      
      USER QUESTION: "${question}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        maxOutputTokens: 1400
      }
    });

    const out = getFullText(response);
    return out || "I couldn't generate a response at this time. Please try again.";

  } catch (e) {
    console.error("Chat Error:", e);
    return "I'm having trouble connecting to the health model right now. Please check your connection and try again.";
  }
};