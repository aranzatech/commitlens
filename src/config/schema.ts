import { z } from "zod";

const commandStepSchema = z.object({
  blocking: z.boolean(),
  name: z.string().min(1),
  run: z.string().min(1),
  type: z.literal("command")
});

const aiStepSchema = z.object({
  blocking: z.boolean(),
  filePatterns: z.array(z.string().min(1)).optional(),
  name: z.string().min(1),
  prompt: z.string().min(1).optional(),
  promptFile: z.string().min(1).optional(),
  type: z.literal("ai")
});

const commitMsgStepSchema = z.object({
  blocking: z.boolean(),
  format: z.string().min(1),
  name: z.string().min(1),
  type: z.literal("commit-msg")
});

const stepSchema = z.discriminatedUnion("type", [
  commandStepSchema,
  aiStepSchema,
  commitMsgStepSchema
]);

const hookSchema = z.object({
  steps: z.array(stepSchema)
});

export const commitlensConfigSchema = z.object({
  fallback: z.array(z.string()).optional(),
  hooks: z
    .object({
      "commit-msg": hookSchema.optional(),
      "pre-commit": hookSchema.optional(),
      "pre-push": hookSchema.optional()
    })
    .refine((value) => Object.keys(value).length > 0, "At least one hook is required."),
  provider: z.string().optional(),
  providers: z.record(z.string(), z.record(z.string(), z.unknown())).optional()
});

export type CommitlensConfigSchema = z.infer<typeof commitlensConfigSchema>;
