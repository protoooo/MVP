import { NextRequest, NextResponse } from "next/server";
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employees, duration, shifts, constraints } = body;

    if (!employees || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse employees
    const employeeList = employees.split('\n').filter((e: string) => e.trim());
    const shiftList = shifts ? shifts.split(',').map((s: string) => s.trim()) : ['Morning', 'Afternoon', 'Evening'];

    // Determine date range based on duration
    const durationMap: Record<string, { days: number; label: string }> = {
      week: { days: 7, label: 'Week' },
      '2weeks': { days: 14, label: '2 Weeks' },
      month: { days: 30, label: 'Month' },
      quarter: { days: 90, label: 'Quarter' },
    };

    const { days, label } = durationMap[duration] || { days: 7, label: 'Week' };

    // Create prompt for AI
    const prompt = `Create an employee work schedule with the following details:

Employees: ${employeeList.join(', ')}
Duration: ${label} (${days} days)
Shift Types: ${shiftList.join(', ')}
${constraints ? `Constraints: ${constraints}` : ''}

Generate a fair and balanced schedule that:
- Distributes shifts evenly among employees
- Respects any constraints mentioned
- Ensures adequate coverage
- Follows labor law best practices (no excessive consecutive days)

Format the schedule as a clear text table with days as columns and employees as rows. Show which shift each employee works each day, or "OFF" for rest days.`;

    const response = await cohere.generate({
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
      model: "command",
    });

    const generatedText = response.generations[0]?.text || "Failed to generate schedule";

    // Try to parse into structured format
    // For now, return as text; can enhance with structured parsing
    return NextResponse.json({
      schedule: generatedText.trim(),
    });
  } catch (error) {
    console.error("Error generating schedule:", error);
    return NextResponse.json(
      { error: "Failed to generate schedule" },
      { status: 500 }
    );
  }
}
