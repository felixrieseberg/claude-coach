import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const mode = (path: string) => statSync(path).mode & 0o777;

// File modes are not meaningful on Windows.
describe.skipIf(process.platform === "win32")("Config file permissions", () => {
  let home: string;
  let originalHome: string | undefined;
  let originalUmask: number;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "claude-coach-home-"));
    originalHome = process.env.HOME;
    process.env.HOME = home;
    // A typical permissive umask, so the test proves we don't rely on it.
    originalUmask = process.umask(0o022);
    vi.resetModules();
  });

  afterEach(() => {
    process.umask(originalUmask);
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(home, { recursive: true, force: true });
  });

  it("writes tokens.json readable only by the owner", async () => {
    const config = await import("../../src/lib/config.js");
    config.saveTokens({
      access_token: "fake-access",
      refresh_token: "fake-refresh",
      expires_at: 1,
      athlete_id: 1,
    });

    expect(mode(config.getTokensPath())).toBe(0o600);
    expect(mode(join(home, ".claude-coach"))).toBe(0o700);
  });

  it("writes config.json readable only by the owner", async () => {
    const config = await import("../../src/lib/config.js");
    config.saveConfig(config.createConfig("12345", "fake-secret"));

    expect(mode(config.getConfigPath())).toBe(0o600);
  });

  it("tightens permissions of files created earlier with a permissive mode", async () => {
    const dir = join(home, ".claude-coach");
    mkdirSync(dir, { mode: 0o755 });
    chmodSync(dir, 0o755);
    writeFileSync(join(dir, "tokens.json"), "{}", { mode: 0o644 });

    const config = await import("../../src/lib/config.js");
    config.saveTokens({
      access_token: "fake-access",
      refresh_token: "fake-refresh",
      expires_at: 1,
      athlete_id: 1,
    });

    expect(mode(config.getTokensPath())).toBe(0o600);
    expect(mode(dir)).toBe(0o700);
  });
});
