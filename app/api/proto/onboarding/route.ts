import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storeOnboardingMemories } from "@/lib/proto-memory";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { businessType, challenges, goals, teamSize, timeConsumers } = body;

    // Validate required fields
    if (!businessType || !challenges || !goals || !teamSize || !timeConsumers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Store onboarding data as Proto memories
    await storeOnboardingMemories(user.id, {
      businessType,
      challenges,
      goals,
      teamSize,
      timeConsumers,
    });

    return NextResponse.json({ 
      success: true,
      message: "Onboarding data stored successfully" 
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to store onboarding data" },
      { status: 500 }
    );
  }
}
