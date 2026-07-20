import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Prefixos de rota protegidos — grupo (app). */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transacoes",
  "/contas",
  "/categorias",
  "/cartoes",
  "/emprestimos",
  "/recorrentes",
  "/orcamentos",
  "/metas",
  "/relatorios",
  "/configuracoes",
  "/familia",
  // Aceite de convite exige login; o ?next= traz o convidado de volta ao
  // link depois de entrar/cadastrar (Fase 16).
  "/convite",
];

/**
 * Páginas do grupo (auth) que um usuário logado não deve ver.
 * /redefinir-senha fica de fora: ela EXIGE a sessão de recuperação
 * criada pelo link do e-mail.
 */
const AUTH_PAGES = ["/login", "/cadastro", "/esqueci-senha"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Redirect que preserva os cookies de sessão já renovados. */
function redirectWithCookies(url: URL, base: NextResponse) {
  const response = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Route handlers de auth cuidam de si mesmos (callback/confirm).
  if (pathname.startsWith("/auth")) return supabaseResponse;

  // "/" → conforme a sessão.
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    url.search = "";
    return redirectWithCookies(url, supabaseResponse);
  }

  // Não autenticado em rota protegida → /login?next=<rota>.
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return redirectWithCookies(url, supabaseResponse);
  }

  // Autenticado em página de auth → /dashboard.
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithCookies(url, supabaseResponse);
  }

  // O middleware é UX, não segurança: cada RSC/Action revalida getUser(),
  // e a RLS é a última linha de defesa (ARQUITETURA.md §6).
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
