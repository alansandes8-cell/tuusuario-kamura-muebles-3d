import { NextResponse } from "next/server";
import { isAdmin } from "./auth";
import { isSameOrigin } from "./security";

/** Verifica sesión (y origen en escrituras) antes de ejecutar una ruta administrativa. */
export async function guardAdmin(req: Request, write = false): Promise<NextResponse | null> {
  if (write && !isSameOrigin(req)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  return null;
}
