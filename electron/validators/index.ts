import { z } from "zod";

/**
 * Validates the arguments passed to an IPC handler using an array of Zod schemas.
 * Throws a formatted error if validation fails, preventing the handler from executing with bad data.
 */
export function validateArgs<T extends any[]>(
  args: unknown[],
  schemas: { [K in keyof T]: z.ZodType<T[K]> },
): T {
  const validatedArgs = [] as any;

  for (let i = 0; i < schemas.length; i++) {
    const schema = schemas[i];
    const arg = args[i];

    const result = schema.safeParse(arg);
    if (!result.success) {
      throw new Error(
        `IPC Validation failed at argument index ${i}: \n${result.error.issues
          .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
          .join("\n")}`,
      );
    }
    validatedArgs.push(result.data);
  }

  return validatedArgs as T;
}
