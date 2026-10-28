import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/adminRoute";
import { getQuoteFile } from "@/lib/server/quotes";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const file = await getQuoteFile(id);
  if (!file) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  const download = new URL(req.url).searchParams.has("descargar");
  return new NextResponse(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
