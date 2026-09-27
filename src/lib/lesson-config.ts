import { z } from "zod";
import backgrounds from "../data/card-backgrounds.json";
export const lessonConfigSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          kind: z.enum([
            "start",
            "question",
            "reading",
            "activity",
            "explanation",
            "image",
            "wall",
          ]),
          title: z.string().max(120),
          text: z.string().max(6000),
          image: z
            .string()
            .max(750000)
            .regex(
              /^(?:data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+|\/api\/lesson-materials\/[0-9a-f-]{36}\/slides\/[0-9]{1,2})$/,
            )
            .optional(),
          enabled: z.boolean(),
        }),
      )
      .max(40),
    theme: z.enum(["midnight", "paper", ...backgrounds.map((item) => item.id)]),
    size: z.enum(["normal", "large", "extra"]),
    activeId: z.string().max(80).nullable(),
    presentedAt: z.number().int().nonnegative().optional(),
  })
  .refine(
    (v) => new Set(v.items.map((x) => x.id)).size === v.items.length,
    "Duplicate slide IDs",
  )
  .refine(
    (v) =>
      v.activeId === null ||
      v.items.some((x) => x.id === v.activeId && x.enabled),
    "Active slide must be visible",
  );
export type LessonConfig = z.infer<typeof lessonConfigSchema>;
export type LessonItem = LessonConfig["items"][number];
