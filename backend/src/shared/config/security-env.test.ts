import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSecurityEnvConfig } from './security-env.js';

describe('getSecurityEnvConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns validated JWT settings when secrets are present', () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48);
    process.env.JWT_EXPIRES_IN = '30m';

    expect(getSecurityEnvConfig()).toEqual({
      jwtSecret: 'a'.repeat(32),
      jwtRefreshSecret: 'b'.repeat(48),
      jwtExpiresIn: '30m'
    });
  });

  it('throws when a required secret is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48);

    expect(() => getSecurityEnvConfig()).toThrow('Missing required environment variable JWT_SECRET');
  });

  it('throws when a secret is too short', () => {
    process.env.JWT_SECRET = 'short-secret';
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48);

    expect(() => getSecurityEnvConfig()).toThrow('JWT_SECRET must be at least 32 characters long');
  });
});
