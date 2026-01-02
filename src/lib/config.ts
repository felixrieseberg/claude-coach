import { homedir } from "os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as readline from "readline";

const CONFIG_DIR = join(homedir(), ".claude-coach");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const TOKENS_FILE = join(CONFIG_DIR, "tokens.json");
const DB_FILE = join(CONFIG_DIR, "coach.db");

export interface StravaConfig {
  client_id: string;
  client_secret: string;
}

export interface Config {
  strava: StravaConfig;
  sync_days: number;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getTokensPath(): string {
  return TOKENS_FILE;
}

export function getDbPath(): string {
  return DB_FILE;
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export function tokensExist(): boolean {
  return existsSync(TOKENS_FILE);
}

export function loadConfig(): Config {
  if (!configExists()) {
    throw new Error(`Config not found at ${CONFIG_FILE}. Run setup first.`);
  }
  const data = readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(data);
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function loadTokens(): Tokens {
  if (!tokensExist()) {
    throw new Error(`Tokens not found at ${TOKENS_FILE}. Run auth first.`);
  }
  const data = readFileSync(TOKENS_FILE, "utf-8");
  return JSON.parse(data);
}

export function saveTokens(tokens: Tokens): void {
  ensureConfigDir();
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export function tokensExpired(tokens: Tokens): boolean {
  // Add 60 second buffer
  return Date.now() / 1000 > tokens.expires_at - 60;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function promptForConfig(): Promise<Config> {
  console.log("\n🚴 Claude Coach Setup\n");
  console.log("To use this tool, you need a Strava API application.");
  console.log("Create one at: https://www.strava.com/settings/api");
  console.log('Set "Authorization Callback Domain" to: localhost\n');

  const client_id = await prompt("Enter your Strava Client ID: ");
  const client_secret = await prompt("Enter your Strava Client Secret: ");
  const sync_days_str = await prompt("Days of history to sync (default 730): ");
  const sync_days = parseInt(sync_days_str) || 730;

  return {
    strava: { client_id, client_secret },
    sync_days,
  };
}

export function createConfig(client_id: string, client_secret: string, sync_days = 730): Config {
  return {
    strava: { client_id, client_secret },
    sync_days,
  };
}
