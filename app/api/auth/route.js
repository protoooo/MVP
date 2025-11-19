import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// THE KEY RING
// Assign these to clients in your own spreadsheet.
// To revoke access, simply delete the line containing the code.
const VALID_CODES = [
  "928374", "192837", "564738", "293847", "102938", 
  "475869", "384756", "574839", "293048", "485960",
  "123987", "657483", "920192", "384729", "102934",
  "584736", "293810", "485739", "192039", "584729",
  "394857", "203948", "574635", "293840", "192834",
  "485726", "394029", "586748", "293845", "102938",
  "475829", "384710", "574829", "293019", "485920",
  "192830", "475860", "384750", "574810", "293050",
  "485930", "192840", "475870", "384760", "574820",
  "293060", "485940", "192850", "475880", "384770"
];

export async function POST(req) {
  try {
    const { code } = await req.json();

    // Check if the entered code exists in our valid list
    if (VALID_CODES.includes(code)) {
      
      // Create the session cookie
      cookies().set("auth_token", "valid_user", { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30 days (Let them stay logged in longer)
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid Access Code" }, { status: 401 });

  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
