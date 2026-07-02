import { z } from "zod";

/**
 * Example schema for Vault Settings validation.
 * Can be used with React Hook Form:
 * const form = useForm({ resolver: zodResolver(VaultSettingsSchema) })
 */
export const VaultSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  syncEnabled: z.boolean().default(false),
  githubRepoUrl: z.string().url().optional().or(z.literal("")),
  githubToken: z.string().optional().or(z.literal("")),
  liveUrl: z.string().url().optional().or(z.literal("")),
});

export type VaultSettingsFormData = z.infer<typeof VaultSettingsSchema>;
