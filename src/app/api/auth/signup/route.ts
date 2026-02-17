import { NextRequest, NextResponse } from "next/server";
import { createUser, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();
    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const user = await createUser(email, name, password);
    const token = await createToken(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
