import { NextResponse } from "next/server";
import { assertSameOrigin, getAdminConfig, sessionCookie } from "../../../../lib/admin";
import { createSession, adminSession, verifyPassword } from "../../../../lib/admin-auth";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const { password } = await request.json();
    const config = getAdminConfig();
    if (!verifyPassword(password, config.password)) return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    const cookie = sessionCookie(createSession(config.secret));
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to sign in." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminSession.name, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to sign out." }, { status: 400 });
  }
}
