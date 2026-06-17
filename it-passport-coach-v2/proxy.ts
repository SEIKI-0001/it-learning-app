import { NextRequest, NextResponse } from "next/server";
import { isValidBasicAuth } from "@/lib/auth";

export function proxy(request: NextRequest) {
  if (!process.env.ADMIN_PASSWORD) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const authorization = request.headers.get("authorization");
  if (!isValidBasicAuth(authorization)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="IT Passport Coach Admin"'
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};
