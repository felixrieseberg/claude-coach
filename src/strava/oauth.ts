import { createServer } from "http";
import { randomBytes, timingSafeEqual } from "crypto";
import { URL } from "url";
import open from "open";
import {
  loadConfig,
  loadTokens,
  saveTokens,
  tokensExist,
  tokensExpired,
  type Tokens,
} from "../lib/config.js";
import { log } from "../lib/logging.js";
import type { StravaTokenResponse } from "./types.js";

const REDIRECT_PORT = 8765;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const TOKEN_URL = "https://www.strava.com/oauth/token";
/** How long the local callback server waits for the browser round trip. */
export const AUTHORIZE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * A fresh random OAuth `state` value. It binds a callback to the authorization
 * request that produced it, so a code issued for a different (e.g.
 * attacker-initiated) request can be rejected.
 */
export function createAuthState(): string {
  return randomBytes(32).toString("hex");
}

/** Constant-time check that a returned `state` is the one we issued. */
export function authStateMatches(returned: string | null | undefined, expected: string): boolean {
  const a = Buffer.from(returned ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildAuthorizeUrl(clientId: string, state: string): URL {
  const authUrl = new URL(AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", "activity:read_all");
  authUrl.searchParams.set("approval_prompt", "auto");
  authUrl.searchParams.set("state", state);
  return authUrl;
}

export async function authorize(): Promise<Tokens> {
  const config = loadConfig();
  const { client_id, client_secret } = config.strava;

  const state = createAuthState();
  const authUrl = buildAuthorizeUrl(client_id, state);

  log.info("Opening browser for Strava authorization...");

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
      // One-shot server: don't keep browser connections alive past the response.
      res.setHeader("Connection", "close");

      if (url.pathname !== "/callback") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }

      // Only a callback carrying our state belongs to this authorization request.
      // Anything else (a forged or stale request) is refused and otherwise ignored.
      if (!authStateMatches(url.searchParams.get("state"), state)) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Authorization failed: state mismatch. Please use the page this command opened.");
        return;
      }

      const fail = (message: string) => {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(`Authorization failed: ${message}`);
        finish(new Error(`Authorization failed: ${message}`));
      };

      const error = url.searchParams.get("error");
      if (error) {
        fail(error);
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        fail("no authorization code in callback");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>✅ Authorization Successful!</h1><p>You can close this window.</p>");
      finish(null, code);
    });

    const timeout = setTimeout(() => {
      finish(
        new Error(
          `Authorization timed out after ${AUTHORIZE_TIMEOUT_MS / 60000} minutes. Please try again.`
        )
      );
    }, AUTHORIZE_TIMEOUT_MS);

    function finish(err: Error | null, code?: string) {
      clearTimeout(timeout);
      server.close();
      if (err) reject(err);
      else resolve(code!);
    }

    server.listen(REDIRECT_PORT, () => {
      open(authUrl.toString());
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start callback server: ${err.message}`));
    });
  });

  log.success("Authorization code received, exchanging for tokens...");

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id,
      client_secret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data: StravaTokenResponse = await tokenResponse.json();

  const tokens: Tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete.id,
  };

  saveTokens(tokens);
  log.success(`Authenticated as ${data.athlete.firstname} ${data.athlete.lastname}`);

  return tokens;
}

export async function refreshTokens(): Promise<Tokens> {
  const config = loadConfig();
  const oldTokens = loadTokens();
  const { client_id, client_secret } = config.strava;

  log.start("Refreshing access token...");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id,
      client_secret,
      refresh_token: oldTokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data: StravaTokenResponse = await response.json();

  const tokens: Tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: oldTokens.athlete_id,
  };

  saveTokens(tokens);
  log.success("Token refreshed");
  return tokens;
}

export async function getValidTokens(): Promise<Tokens> {
  if (!tokensExist()) {
    return authorize();
  }

  const tokens = loadTokens();

  if (tokensExpired(tokens)) {
    return refreshTokens();
  }

  return tokens;
}
