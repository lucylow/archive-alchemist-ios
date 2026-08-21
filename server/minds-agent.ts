import { z } from "zod";

import { invokeLLM } from "./_core/llm";
import type { MindsDiscoveryRequest, MindsDiscoveryResponse } from "../shared/minds";

const supportedPlatforms = ["YouTube", "Spotify", "Substack", "Twitter", "Instagram", "TikTok"] as const;

export const mindsDiscoveryInput = z.object({
  platforms: z.array(z.enum(supportedPlatforms)).min(1).max(supportedPlatforms.length),
  archiveTitle: z.string().trim().min(1).max(120),
  sourceYear: z.number().int().min(1900).max(new Date().getFullYear()),
  sourceViews: z.string().trim().min(1).max(32),
});

const mindsDiscoveryOutput = z.object({
  summary: z.string().trim().min(1).max(500),
  recommendations: z.array(
    z.object({
      title: z.string().trim().min(1).max(120),
      rationale: z.string().trim().min(1).max(400),
      formats: z.array(z.string().trim().min(1).max(80)).min(1).max(4),
      confidence: z.number().min(0).max(1),
    }),
  ).min(1).max(4),
});

const getTextContent = (content: unknown) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part ? part.text : ""))
    .join("\n");
};

export async function runMindsDiscovery(input: MindsDiscoveryRequest): Promise<MindsDiscoveryResponse> {
  const validatedInput = mindsDiscoveryInput.parse(input);
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: [
          "You are Minds, the Archive Alchemist's creator-archive strategist.",
          "Analyze one dormant archive item and propose practical, platform-aware ways to give it another life.",
          "Do not claim that you posted, scheduled, authenticated, or accessed any platform.",
          "Return JSON only with this shape: { summary: string, recommendations: [{ title: string, rationale: string, formats: string[], confidence: number }] }.",
          "Keep recommendations concise, specific, and grounded in the supplied platforms and archive metadata.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(validatedInput),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = getTextContent(response.choices[0]?.message.content);
  const parsed = JSON.parse(content) as unknown;
  return mindsDiscoveryOutput.parse(parsed);
}
