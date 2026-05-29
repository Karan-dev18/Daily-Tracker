import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Public routes that don't require authentication.
 * These bypass the Supabase session check entirely.
 */
const PUBLIC_ROUTES = ["/login", "/signup", "/auth/callback", "/auth/confirm", "/preview"];

/**
 * Refreshes the Supabase auth session and enforces route protection.
 * Called by the root middleware on every request.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Fast path: skip Supabase entirely for public routes ───
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublicRoute) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // ─── Validate env vars before creating client ───
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl === "your-supabase-project-url" ||
    !supabaseUrl.startsWith("http")
  ) {
    // Supabase not configured — allow root, redirect protected routes to login
    if (pathname === "/") {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do NOT call supabase.auth.getSession() here.
  // getUser() sends a request to the Supabase Auth server every time
  // to revalidate the Auth token, which is safer for middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── Route Protection Logic ───

  // If user is NOT authenticated and trying to access a protected route
  if (!user && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user IS authenticated and trying to access login/signup pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // If user visits root "/" and is authenticated, redirect to dashboard
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
