export interface SecurityEnvConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
}

function readRequiredSecret(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }

  if (value.length < 32) {
    throw new Error(`${key} must be at least 32 characters long`);
  }

  return value;
}

export function getSecurityEnvConfig(): SecurityEnvConfig {
  return {
    jwtSecret: readRequiredSecret('JWT_SECRET'),
    jwtRefreshSecret: readRequiredSecret('JWT_REFRESH_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '15m'
  };
}
