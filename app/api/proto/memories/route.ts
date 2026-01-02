import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProtoMemories } from "@/lib/proto-memory";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memoryType = searchParams.get("type") as any;
    const category = searchParams.get("category") as any;

    const memories = await getProtoMemories(user.id, memoryType, category);

    return NextResponse.json({ memories });
  } catch (error) {
    console.error("Get memories error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve memories" },
      { status: 500 }
    );
  }
}
