import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";
import { headers } from "next/headers";
import aj from "./lib/arcject";
import { createMiddleware, detectBot, shield } from "@arcjet/next";

/**
 * Ensures user is authenticated before visiting the main page
 * @param req
 * @param res
 * @returns
 */
export async function middleware(req: NextRequest, res: NextResponse) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.redirect(new URL("sign-in", req.url));
  }

  return NextResponse.next();
}

const validate = aj
  .withRule(
    shield({
      // Shield protects your app from common attacks e.g. SQL injection, CSRF etc.
      mode: "LIVE",
    })
  )
  .withRule(
    detectBot({
      mode: "LIVE",
      //  allow Google, Bing, etc
      allow: ["CATEGORY:SEARCH_ENGINE", "GOOGLE_CRAWLER"],
    })
  );

export default createMiddleware(validate);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sign-in|assets).*)"],
};
