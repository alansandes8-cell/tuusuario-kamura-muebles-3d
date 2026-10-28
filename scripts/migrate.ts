/**
 * Crea o actualiza las tablas en la base configurada (DATABASE_URL o PGlite local).
 * Uso: npm run db:migrate
 */
import { getDb } from "../src/lib/server/db";

getDb()
  .then(async (db) => {
    const rows = await db.query<{ id: number; name: string }>("select id, name from kamura.schema_migrations order by id");
    console.log("Migraciones aplicadas:", rows.map((r) => `${r.id} (${r.name})`).join(", "));
    await db.close();
  })
  .catch((e) => {
    console.error("No se pudo migrar:", e);
    process.exit(1);
  });
