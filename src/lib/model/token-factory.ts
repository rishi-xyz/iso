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
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are an expert CI failure investigator. 
You must distinguish observed facts from hypotheses. 
Only cite evidence IDs that are provided. 
Return valid JSON matching this schema exactly:
{
  "summary": string,
  "observedFacts": [{"text": string, "evidenceIds": string[]}],
  "likelyCauses": [{"text": string, "confidence": "low"|"medium"|"high", "evidenceIds": string[]}],
  "recommendedChecks": string[],
  "limitations": string[]
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
  const content = json.choices?.[0]?.message?.content || "";
  
  // Try to parse JSON from content
  let parsed;
  try {
    // Remove markdown code blocks if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to parse model response as JSON");
  }

  return DiagnosisSchema.parse(parsed);
}
