import { NextResponse, type NextRequest } from "next/server";

/** Primera barrera del panel: sin cookie de sesión, se redirige al ingreso. La validación real se hace en el servidor. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/ingresar" && !req.cookies.get("kamura_admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/ingresar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
