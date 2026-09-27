import { z } from "zod";
import { decodeJsonContainer } from "./json-data";
export const aiContentSchemas = {
  questions: z.object({ questions: z.array(z.string()).min(1).max(10) }),
  worksheet: z.object({
    items: z
      .array(z.object({ ko: z.string(), en: z.string() }))
      .min(1)
      .max(20),
  }),
  insight: z.object({
    headline: z.string(),
    question: z.string(),
    action: z.string(),
  }),
  weekly: z.object({
    summary: z.string(),
    themes: z.array(z.string()),
    nextQuestion: z.string(),
    sentence: z.string(),
  }),
  class_brief: z.object({
    summary: z.string(),
    themes: z.array(z.string()),
    questions: z.array(z.string()),
  }),
  translate: z.object({ translation: z.string() }),
  curriculum: z.object({
    weeks: z
      .array(
        z.object({
          title: z.object({ ko: z.string(), en: z.string() }),
          reference: z.object({ ko: z.string(), en: z.string() }),
          start: z.string(),
          end: z.string(),
          sourcePage: z.number(),
        }),
      )
      .max(60),
  }),
} as const;

export function parseAiContent(feature: string, value: unknown) {
  if (!Object.hasOwn(aiContentSchemas, feature)) return null;
  const schema = aiContentSchemas[feature as keyof typeof aiContentSchemas];
  const result = schema.safeParse(decodeJsonContainer(value));
  return result.success ? result.data : null;
}
