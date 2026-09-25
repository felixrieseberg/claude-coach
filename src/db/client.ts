import { execFileSync, spawnSync } from "child_process";
import { getDbPath } from "../lib/config.js";

// ============================================================================
// SQLite Backend Abstraction
// ============================================================================

export interface SqliteBackend {
  query(sql: string): string;
  queryJson<T>(sql: string): T[];
  execute(sql: string): void;
}

let cachedBackend: SqliteBackend | null = null;

/**
 * Try to use Node's built-in SQLite module (Node 22.5+).
 * Falls back to shelling out to sqlite3 CLI if not available.
 */
async function detectBackend(): Promise<SqliteBackend> {
  // Try Node.js built-in SQLite first (Node 22.5+)
  try {
    // Dynamic import to avoid syntax errors on older Node versions
    const sqlite = await import("node:sqlite");
    const dbPath = getDbPath();
    const db = new sqlite.DatabaseSync(dbPath);

    return {
      query(sql: string): string {
        const stmt = db.prepare(sql);
        const rows = stmt.all();
        if (rows.length === 0) return "";
        // Format as simple text output (column values separated by |)
        return rows
          .map((row) =>
            Object.values(row as Record<string, unknown>)
              .map((v) => (v === null ? "" : String(v)))
              .join("|")
          )
          .join("\n");
      },
      queryJson<T>(sql: string): T[] {
        const stmt = db.prepare(sql);
        return stmt.all() as T[];
      },
      execute(sql: string): void {
        db.exec(sql);
      },
    };
  } catch {
    // Node.js built-in SQLite not available, try CLI
  }

  // Fallback: Use sqlite3 CLI
  try {
    // Check if sqlite3 is available
    execFileSync("sqlite3", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "SQLite is not available. Please either:\n" +
        "  1. Use Node.js 22.5+ (has built-in SQLite)\n" +
        "  2. Install sqlite3 CLI (brew install sqlite3 / apt install sqlite3)"
    );
  }

  return createCliBackend(getDbPath());
}

/**
 * Backend that shells out to the sqlite3 CLI. SQL is passed on stdin and the
 * database path as an argv entry (never through a shell) so that quotes,
 * backticks, `$()` and `;` in SQL or paths cannot escape into a shell command.
 *
 * Exported for tests.
 */
export function createCliBackend(dbPath: string): SqliteBackend {
  function run(args: string[], sql: string): string {
    const result = spawnSync("sqlite3", [...args, dbPath], {
      input: sql,
      encoding: "utf-8",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`SQLite error: ${result.stderr}`);
    }
    return result.stdout;
  }

  return {
    query(sql: string): string {
      return run([], sql);
    },
    queryJson<T>(sql: string): T[] {
      const result = run(["-json"], sql);
      if (!result.trim()) return [];
      return JSON.parse(result);
    },
    execute(sql: string): void {
      run([], sql);
    },
  };
}

/**
 * Initialize the SQLite backend. Must be called before using other functions.
 */
export async function initDatabase(): Promise<void> {
  if (!cachedBackend) {
    cachedBackend = await detectBackend();
  }
}

/**
 * Get the backend, throwing if not initialized.
 */
function getBackend(): SqliteBackend {
  if (!cachedBackend) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return cachedBackend;
}

// ============================================================================
// Public API (synchronous after initialization)
// ============================================================================

export function query(sql: string): string {
  return getBackend().query(sql);
}

export function queryJson<T>(sql: string): T[] {
  return getBackend().queryJson<T>(sql);
}

export function execute(sql: string): void {
  getBackend().execute(sql);
}

export function runScript(script: string): void {
  execute(script);
}
