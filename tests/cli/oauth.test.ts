import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { request } from "http";

// authorize() runs a real local callback server; everything that would touch
// Strava, the browser or ~/.claude-coach is replaced with fakes.
const opened = vi.hoisted(() => ({ url: null as URL | null }));
const saved = vi.hoisted(() => ({ tokens: null as unknown }));

vi.mock("open", () => ({
  default: vi.fn(async (url: string) => {
    opened.url = new URL(url);
  }),
}));

vi.mock("../../src/lib/config.js", () => ({
  loadConfig: () => ({
    strava: { client_id: "12345", client_secret: "fake-secret" },
    sync_days: 1,
  }),
  saveTokens: (tokens: unknown) => {
    saved.tokens = tokens;
  },
  loadTokens: () => {
    throw new Error("not used");
  },
  tokensExist: () => false,
  tokensExpired: () => false,
}));

vi.mock("../../src/lib/logging.js", () => ({
  log: { info: vi.fn(), success: vi.fn(), start: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { authorize, AUTHORIZE_TIMEOUT_MS } from "../../src/strava/oauth.js";

/** GET a path on the local callback server, resolving with status and body. */
function callback(query: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(`http://127.0.0.1:8765/callback?${query}`, (res) => {
      let body = "";
      res.setEncoding("utf-8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode!, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForBrowser(): Promise<URL> {
  await vi.waitFor(() => expect(opened.url).not.toBeNull());
  return opened.url!;
}

describe("Strava OAuth authorize()", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    opened.url = null;
    saved.tokens = null;
    fetchMock = vi.fn(async () =>
      Response.json({
        access_token: "fake-access",
        refresh_token: "fake-refresh",
        expires_at: 2000000000,
        athlete: { id: 42, firstname: "Test", lastname: "Athlete" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    // Let the callback server finish releasing the port before the next test listens.
    await new Promise((resolve) => setImmediate(resolve));
  });

  it("sends a random state and exchanges the code when the callback echoes it", async () => {
    const result = authorize();
    const authUrl = await waitForBrowser();

    const state = authUrl.searchParams.get("state");
    expect(state).toMatch(/^[0-9a-f]{64}$/);
    expect(authUrl.searchParams.get("client_id")).toBe("12345");

    const res = await callback(`code=the-code&scope=read&state=${state}`);
    expect(res.status).toBe(200);

    const tokens = await result;
    expect(tokens).toEqual({
      access_token: "fake-access",
      refresh_token: "fake-refresh",
      expires_at: 2000000000,
      athlete_id: 42,
    });
    expect(saved.tokens).toEqual(tokens);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ code: "the-code" });
  });

  it("uses a fresh state for every authorization", async () => {
    const first = authorize();
    const firstState = (await waitForBrowser()).searchParams.get("state");
    await callback(`code=a&state=${firstState}`);
    await first;

    opened.url = null;
    const second = authorize();
    const secondState = (await waitForBrowser()).searchParams.get("state");
    await callback(`code=b&state=${secondState}`);
    await second;

    expect(secondState).not.toBe(firstState);
  });

  it("refuses a callback with a missing or forged state and keeps waiting for the real one", async () => {
    const result = authorize();
    const state = (await waitForBrowser()).searchParams.get("state");

    const missing = await callback("code=attacker-code");
    expect(missing.status).toBe(400);
    expect(missing.body).toContain("state mismatch");

    const forged = await callback(`code=attacker-code&state=${"0".repeat(64)}`);
    expect(forged.status).toBe(400);

    // An error redirect without our state must not be able to abort the flow either.
    expect((await callback("error=access_denied")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();

    const genuine = await callback(`code=genuine-code&state=${state}`);
    expect(genuine.status).toBe(200);
    await result;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ code: "genuine-code" });
  });

  it("fails when Strava reports an error for our request", async () => {
    const result = authorize();
    const rejection = expect(result).rejects.toThrow("Authorization failed: access_denied");
    const state = (await waitForBrowser()).searchParams.get("state");

    const res = await callback(`error=access_denied&state=${state}`);
    expect(res.status).toBe(400);
    await rejection;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops listening after the timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const result = authorize();
    const rejection = expect(result).rejects.toThrow(/timed out/);
    await waitForBrowser();

    vi.advanceTimersByTime(AUTHORIZE_TIMEOUT_MS);
    await rejection;

    // The port is free again, so the callback server is gone.
    await expect(callback("code=late")).rejects.toThrow(/ECONNREFUSED/);
  });
});
