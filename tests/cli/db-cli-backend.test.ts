import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createCliBackend, type SqliteBackend } from "../../src/db/client.js";

const hasSqliteCli = spawnSync("sqlite3", ["--version"]).status === 0;

describe.skipIf(!hasSqliteCli)("sqlite3 CLI backend", () => {
  let dir: string;
  let db: SqliteBackend;

  beforeEach(() => {
    // A path with spaces and shell metacharacters must be passed through untouched.
    dir = mkdtempSync(join(tmpdir(), "claude coach $(db) `test`;"));
    db = createCliBackend(join(dir, "coach.db"));
    db.execute("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT);");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("round-trips SQL containing shell metacharacters without running them", () => {
    const marker = join(dir, "pwned");
    const body = `"; $(touch '${marker}') \`touch '${marker}'\` && echo "`;

    db.execute(`INSERT INTO notes (id, body) VALUES (1, '${body.replace(/'/g, "''")}');`);

    expect(db.queryJson<{ body: string }>("SELECT body FROM notes WHERE id = 1;")).toEqual([
      { body },
    ]);
    expect(db.query(`SELECT '$(touch "${marker}")' AS x;`).trim()).toBe(`$(touch "${marker}")`);
    expect(existsSync(marker)).toBe(false);
    expect(readdirSync(dir)).toEqual(["coach.db"]);
  });

  it("returns an empty result for queries with no rows", () => {
    expect(db.query("SELECT * FROM notes;")).toBe("");
    expect(db.queryJson("SELECT * FROM notes;")).toEqual([]);
  });

  it("formats plain query output as pipe-separated columns", () => {
    db.execute("INSERT INTO notes (id, body) VALUES (1, 'a'), (2, NULL);");
    expect(db.query("SELECT id, body FROM notes ORDER BY id;")).toBe("1|a\n2|\n");
  });

  it("surfaces SQLite errors", () => {
    expect(() => db.query("SELECT * FROM missing_table;")).toThrow(/SQLite error/);
  });
});
