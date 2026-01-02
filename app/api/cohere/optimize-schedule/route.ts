import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/cohere";

interface Staff {
  id: string;
  name: string;
  role: string;
  availability: Record<string, string>;
  max_hours: number;
}

interface Requirements {
  shifts_per_day: number;
  roles_needed: Record<string, number>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staff, requirements } = body as { staff: Staff[]; requirements: Requirements };

    const prompt = `You are a restaurant shift scheduler. Generate a fair 7-day schedule for the following staff and requirements.

Staff:
${staff.map(s => `- ${s.name} (${s.role}): Available ${JSON.stringify(s.availability)}, max ${s.max_hours} hours/week`).join('\n')}

Requirements:
- ${requirements.shifts_per_day} shifts per day
- Roles needed per shift: ${JSON.stringify(requirements.roles_needed)}

Generate a schedule that:
1. Respects each staff member's availability
2. Doesn't exceed max hours per week
3. Distributes shifts fairly
4. Meets role requirements

Output ONLY a JSON array of shifts in this exact format:
[
  {
    "staff_id": "uuid",
    "staff_name": "name",
    "shift_date": "2026-01-03",
    "start_time": "09:00",
    "end_time": "17:00",
    "role": "cook"
  }
]

No explanations, just the JSON array.`;

    const response = await chat(prompt);
    
    // Extract JSON from response
    let schedules;
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        schedules = JSON.parse(jsonMatch[0]);
      } else {
        schedules = JSON.parse(response);
      }
    } catch (parseError) {
      console.error("Error parsing Cohere response:", parseError);
      console.log("Raw response:", response);
      return NextResponse.json(
        { error: "Failed to parse schedule from AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error optimizing schedule:", error);
    return NextResponse.json(
      { error: "Failed to optimize schedule" },
      { status: 500 }
    );
  }
}
