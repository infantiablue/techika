import { cookies } from "next/headers";
import { adminSession, verifySession } from "./admin-auth";

export function getAdminConfig() {
  const { ADMIN_PASSWORD, ADMIN_SESSION_SECRET } = process.env;
  if (!ADMIN_PASSWORD || !ADMIN_SESSION_SECRET) throw new Error("Admin authentication is not configured.");
  return { password: ADMIN_PASSWORD, secret: ADMIN_SESSION_SECRET };
}

export async function hasAdminSession() {
  try {
    const { secret } = getAdminConfig();
    return verifySession((await cookies()).get(adminSession.name)?.value, secret);
  } catch {
    return false;
  }
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Invalid request origin.");
}

export function sessionCookie(value) {
  return { name: adminSession.name, value, options: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: adminSession.maxAge } };
}
