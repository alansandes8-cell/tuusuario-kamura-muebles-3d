import { getDb } from "./db";

/**
 * Límite de uso por ventana de tiempo, guardado en la base de datos (funciona
 * en entornos sin servidor, donde no hay memoria compartida entre pedidos).
 * Devuelve true si el pedido está permitido.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = await getDb();
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  const rows = await db.query<{ count: number }>(
    `insert into kamura.rate_limits (bucket, window_start, count) values ($1, $2, 1)
     on conflict (bucket, window_start) do update set count = kamura.rate_limits.count + 1
     returning count`,
    [bucket, windowStart],
  );
  if (Math.random() < 0.02) {
    void db.query("delete from kamura.rate_limits where window_start < now() - interval '2 days'").catch(() => undefined);
  }
  return Number(rows[0]?.count ?? 0) <= limit;
}
