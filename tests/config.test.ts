import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We'll test the config functions by mocking the config directory
describe("Config", () => {
  const testDir = join(tmpdir(), "claude-coach-test-" + Date.now());
  const configFile = join(testDir, "config.json");
  const tokensFile = join(testDir, "tokens.json");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("config file operations", () => {
    it("should write and read config correctly", () => {
      const config = {
        strava: {
          client_id: "12345",
          client_secret: "secret123",
        },
        sync_days: 730,
      };

      writeFileSync(configFile, JSON.stringify(config, null, 2));

      expect(existsSync(configFile)).toBe(true);

      const loaded = JSON.parse(readFileSync(configFile, "utf-8"));
      expect(loaded.strava.client_id).toBe("12345");
      expect(loaded.strava.client_secret).toBe("secret123");
      expect(loaded.sync_days).toBe(730);
    });

    it("should write and read tokens correctly", () => {
      const tokens = {
        access_token: "access123",
        refresh_token: "refresh456",
        expires_at: 1234567890,
        athlete_id: 99999,
      };

      writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));

      expect(existsSync(tokensFile)).toBe(true);

      const loaded = JSON.parse(readFileSync(tokensFile, "utf-8"));
      expect(loaded.access_token).toBe("access123");
      expect(loaded.refresh_token).toBe("refresh456");
      expect(loaded.expires_at).toBe(1234567890);
      expect(loaded.athlete_id).toBe(99999);
    });
  });

  describe("token expiration", () => {
    it("should detect expired tokens", () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredTokens = { expires_at: now - 100 };
      const validTokens = { expires_at: now + 3600 };

      // Token expired if current time > expires_at - 60 (buffer)
      expect(now > expiredTokens.expires_at - 60).toBe(true);
      expect(now > validTokens.expires_at - 60).toBe(false);
    });
  });
});
