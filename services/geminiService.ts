import { GoogleGenAI } from "@google/genai";
import { UserProfile, SimulationResponse } from "../types";

const SYSTEM_INSTRUCTION = `
You are "See Your Future Health", an advanced predictive engine.
Your goal is to provide a HARD-HITTING, DATA-DRIVEN, and SCIENTIFICALLY SOURCED projection of a user's health.

**CRITICAL RULES:**
1. **NO GENERIC ADVICE.** (Do not say "Sleep is good for you").
2. **NO MARKDOWN HEADERS** (Do not use ##).
3. **POWERFUL STATEMENTS.** Start sections with the Condition or Outcome in bold caps. (e.g., "**CARDIOVASCULAR DISEASE RISK**").
4. **NUMBERS & PERCENTAGES.** You MUST provide specific statistical projections based on the inputs (e.g., "Risk increases by 45% compared to average," "Life expectancy reduced by 6.2 years").
5. **MANDATORY CITATIONS.** Every claim must cite a specific paper, study, or organization (WHO, CDC, Lancet, Nature). Format: (Source: Author/Org, Year).
6. **COMPARE TO AVERAGE.** Always contextualize the user's data against the population average.
7. **HIGHLIGHT ORGANS.** Use [highlight:organ_name] when discussing specific body parts.

**Format Structure:**
For each point (10 years and 20 years):
**[CONDITION NAME]** [highlight:organ]
[Specific percentage risk/change]. [Comparison to average]. [One sentence explanation]. (Source: [Citation]).

**Output Format:**
You must return a SINGLE RAW JSON object. Do not wrap it in markdown code blocks.
The JSON must match this schema:
{
  "markdownReport": "string (The text report)",
  "suggestedAction": "string (Short high-impact advice)",
  "healthScoreCurrent": number,
  "healthScoreFuture": number,
  "organHighlights": string[]
}
`;

export const generateHealthProjection = async (profile: UserProfile): Promise<SimulationResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Search for medical research papers and population health statistics (CDC, WHO, NIH, Lancet) matching this profile.
      Then, generate a health projection JSON.

      User Profile:
      - Age: ${profile.age}
      - Sex: ${profile.gender}
      - BMI Context: Height ${profile.heightCm}cm, Weight ${profile.weightKg}kg
      - Sleep: ${profile.sleepHours} hours/night
      - Activity: ${profile.activityLevel}
      - Smoking: ${profile.smoker ? `Yes, ${profile.cigarettesPerDay} per day` : "No"}
      - Alcohol: ${profile.alcoholDrinksPerWeek} drinks/week
      - Diet: ${profile.dietQuality}

      Return ONLY the JSON object.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }] // Enabled for research grounding
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Clean up potential markdown formatting from the response
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson) as SimulationResponse;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback response in case of error
    return {
      markdownReport: "**SYSTEM ERROR** [highlight:brain]\nUnable to retrieve research data at this time. Please try again later.",
      suggestedAction: "Retry the simulation.",
      healthScoreCurrent: 0,
      healthScoreFuture: 0,
      organHighlights: []
    };
  }
};
