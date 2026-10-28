import { z } from "zod";

const DiagnosisSchema = z.object({
  schemaVersion: z.string().optional(),
  summary: z.string(),
  observedFacts: z.array(z.object({
    text: z.string(),
    evidenceIds: z.array(z.string()).optional(),
  })).default([]),
  likelyCauses: z.array(z.object({
    text: z.string(),
    confidence: z.enum(["low", "medium", "high"]).optional(),
    evidenceIds: z.array(z.string()).optional(),
  })).default([]),
  recommendedChecks: z.array(z.string()).default([]),
  patchProposal: z.any().nullable().optional(),
  limitations: z.array(z.string()).default([]),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;

export async function diagnoseWithTokenFactory(params: {
  baseUrl?: string;
  apiKey: string;
  modelId: string;
  context: string;
}) {
  const baseUrl = params.baseUrl || process.env.NEBIUS_TOKEN_FACTORY_BASE_URL || "https://api.tokenfactory.nebius.com/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.modelId,
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert CI failure investigator. 
You must distinguish observed facts from hypotheses. 
Only cite evidence IDs that are provided. 
Return ONLY valid JSON with no extra text, matching this schema exactly:
{
  "summary": "string",
  "observedFacts": [{"text": "string", "evidenceIds": ["string"]}],
  "likelyCauses": [{"text": "string", "confidence": "low"|"medium"|"high", "evidenceIds": ["string"]}],
  "recommendedChecks": ["string"],
  "limitations": ["string"]
}
Do not claim tests passed unless explicitly stated in evidence. Mark uncertainties clearly.`
        },
        {
          role: "user",
          content: params.context,
        }
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token Factory error: ${res.status} ${text}`);
  }

  const json = await res.json();
  let content = json.choices?.[0]?.message?.content || "";
  if (Array.isArray(content)) {
    content = content.map((c: any) => c.text || c.content || "").join("\n");
  }
  if (typeof content !== "string") content = String(content);
  
  // Try to parse JSON from content
  let parsed;
  try {
    let cleaned = content.trim();
    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    // Try to find JSON object in text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      cleaned = match[0];
    }
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to parse model response as JSON");
  }

  return DiagnosisSchema.parse(parsed);
}
