import { NextRequest, NextResponse } from "next/server";
import { classifyText, generateText } from "@/lib/cohere";

// Mock financial data
const transactions = [
  { id: 1, date: "2024-12-01", amount: 1200, description: "Office supplies purchase", category: "Supplies" },
  { id: 2, date: "2024-12-05", amount: 3500, description: "Rent payment", category: "Rent" },
  { id: 3, date: "2024-12-10", amount: 450, description: "Client lunch meeting", category: "Meals" },
  { id: 4, date: "2024-12-15", amount: 2100, description: "Software subscriptions", category: "Technology" },
  { id: 5, date: "2024-12-20", amount: 800, description: "Marketing materials", category: "Marketing" },
];

export async function POST(request: NextRequest) {
  try {
    const { action, transaction } = await request.json();

    if (action === "categorize" && transaction) {
      // Categorize a transaction using Cohere
      const examples = [
        { text: "Office supplies purchase", label: "Supplies" },
        { text: "Rent payment for office space", label: "Rent" },
        { text: "Team lunch at restaurant", label: "Meals" },
        { text: "Adobe Creative Cloud subscription", label: "Technology" },
        { text: "Facebook ads campaign", label: "Marketing" },
        { text: "Employee salary payment", label: "Payroll" },
      ];

      const classifications = await classifyText([transaction.description], examples);
      const category = classifications[0]?.prediction || "Uncategorized";

      return NextResponse.json({
        transaction: { ...transaction, category },
        confidence: classifications[0]?.confidence,
      });
    }

    if (action === "summarize") {
      // Generate financial summary
      const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
      const categoryBreakdown = transactions.reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

      const prompt = `Generate a brief financial summary for the following data:
Total Expenses: $${totalExpenses}
Category Breakdown: ${JSON.stringify(categoryBreakdown, null, 2)}

Provide insights and recommendations in 2-3 sentences.`;

      const summary = await generateText(prompt, { maxTokens: 200 });

      return NextResponse.json({
        totalExpenses,
        categoryBreakdown,
        summary,
        transactions,
      });
    }

    if (action === "get-all") {
      const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
      return NextResponse.json({ transactions, totalExpenses });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Financial API error:", error);
    return NextResponse.json(
      { error: "Failed to process financial request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
  return NextResponse.json({ transactions, totalExpenses });
}
