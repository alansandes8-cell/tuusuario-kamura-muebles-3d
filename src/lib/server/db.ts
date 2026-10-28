/**
 * Acceso a PostgreSQL.
 *
 * - Producción: DATABASE_URL (por ejemplo, Supabase). Con el pooler en modo
 *   transacción (puerto 6543) se desactivan las sentencias preparadas.
 * - Desarrollo y pruebas: PGlite (PostgreSQL embebido), en ./.data/pglite o en
 *   memoria (PGLITE_DIR=memory://). Mismo SQL en ambos casos.
 */
import { MIGRATIONS } from "./migrations";

export type Row = Record<string, unknown>;
export type QueryFn = <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;

export interface Db {
  query: QueryFn;
  tx: <T>(fn: (q: QueryFn) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
}

async function createPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  });
  const wrap =
    (runner: { unsafe: (q: string, p?: never[]) => Promise<unknown> }): QueryFn =>
    async <T,>(q: string, params: unknown[] = []) =>
      (await runner.unsafe(q, params as never[])) as unknown as T[];
  return {
    query: wrap(sql),
    tx: async (fn) => (await sql.begin((t) => fn(wrap(t as never)))) as never,
    close: () => sql.end({ timeout: 5 }),
  };
}

async function createPglite(dir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (!dir.startsWith("memory://")) {
    const fs = await import("node:fs");
    fs.mkdirSync(dir, { recursive: true });
  }
  const pg = await PGlite.create(dir);
  const wrap =
    (runner: { query: (q: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): QueryFn =>
    async <T,>(q: string, params: unknown[] = []) =>
      (await runner.query(q, params)).rows as T[];
  return {
    query: wrap(pg),
    tx: (fn) => pg.transaction((t) => fn(wrap(t))),
    close: () => pg.close(),
  };
}

async function migrate(db: Db) {
  await db.query("create schema if not exists kamura");
  await db.query(
    "create table if not exists kamura.schema_migrations (id integer primary key, name text not null, applied_at timestamptz not null default now())",
  );
  const done = new Set((await db.query<{ id: number }>("select id from kamura.schema_migrations")).map((r) => Number(r.id)));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.tx(async (q) => {
      for (const stmt of m.sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
        await q(stmt);
      }
      await q("insert into kamura.schema_migrations (id, name) values ($1, $2)", [m.id, m.name]);
    });
  }
}

const globalForDb = globalThis as unknown as { __kamuraDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__kamuraDb) {
    globalForDb.__kamuraDb = (async () => {
      const url = process.env.DATABASE_URL;
      let db: Db;
      if (url) {
        db = await createPostgres(url);
      } else {
        if (process.env.NODE_ENV === "production" && !process.env.PGLITE_DIR) {
          throw new Error("Falta configurar DATABASE_URL.");
        }
        db = await createPglite(process.env.PGLITE_DIR ?? ".data/pglite");
      }
      await migrate(db);
      return db;
    })().catch((e) => {
      globalForDb.__kamuraDb = undefined;
      throw e;
    });
  }
  return globalForDb.__kamuraDb;
}

/** Solo para pruebas: descarta la conexión actual. */
export async function resetDbForTests() {
  const current = globalForDb.__kamuraDb;
  globalForDb.__kamuraDb = undefined;
  if (current) await (await current).close().catch(() => undefined);
}

export { migrate };
