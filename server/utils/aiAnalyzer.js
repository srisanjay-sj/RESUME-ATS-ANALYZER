import dotenv from "dotenv";
dotenv.config();

const buildPrompt = (resumeText, jobDescription) => `
You are an ATS resume analyzer.
Return STRICT JSON only.
Do not wrap in markdown.
Do not include backticks.
Do not include explanations.
Use this exact schema:
{
  "atsScore": number,
  "strengths": [string],
  "missingSkills": [string],
  "suggestions": [string],
  "bulletPointImprovements": [string]
}

The "strengths" array should list 3-5 specific things the resume already does well in relation to the job description (skills present, relevant experience, strong sections, etc).

Resume:
${resumeText}

Job Description:
${jobDescription}
`;

export const analyzeWithGemini = async (resumeText, jobDescription) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is undefined");
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(resumeText, jobDescription) }]
            }
          ],
          generationConfig: { temperature: 0.2 }
        })
      }
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Empty Gemini response");
    }

    try {
      const parsed = JSON.parse(
        rawText.replace(/```json/g, "").replace(/```/g, "").trim()
      );
      return parsed;
    } catch {
      return { raw: rawText };
    }
  } catch (err) {
    console.error("Gemini Error:", err.message);
    throw err;
  }
};