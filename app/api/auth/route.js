import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req) {
  const { code } = await req.json();

  // Check against the environment variable
  if (code === process.env.SITE_PASSWORD) {
    // Set a cookie that lasts 7 days
    cookies().set("auth_token", "valid_user", { 
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid code" }, { status: 401 });
}
