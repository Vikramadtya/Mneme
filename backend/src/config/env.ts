export interface Env {
  MONGO_URI: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  CORS_ORIGIN: string;
  PORT: number;
}

/** Fails fast at boot instead of silently running with insecure defaults. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const missing = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'].filter((k) => !raw[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (String(raw.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return {
    MONGO_URI: String(raw.MONGO_URI),
    JWT_SECRET: String(raw.JWT_SECRET),
    GOOGLE_CLIENT_ID: String(raw.GOOGLE_CLIENT_ID),
    CORS_ORIGIN: String(raw.CORS_ORIGIN || 'http://localhost:5173'),
    PORT: Number(raw.PORT) || 8080,
  };
}
