import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/cohere";

// Mock inventory data
let inventoryData = [
  { id: 1, name: "Laptop", quantity: 15, threshold: 10, category: "Electronics" },
  { id: 2, name: "Office Chair", quantity: 8, threshold: 12, category: "Furniture" },
  { id: 3, name: "Printer Paper", quantity: 50, threshold: 20, category: "Supplies" },
  { id: 4, name: "Pens", quantity: 100, threshold: 50, category: "Supplies" },
  { id: 5, name: "Monitor", quantity: 5, threshold: 8, category: "Electronics" },
];

export async function POST(request: NextRequest) {
  try {
    const { action, itemId, quantity } = await request.json();

    if (action === "get-all") {
      const alerts = inventoryData.filter(item => item.quantity < item.threshold);
      return NextResponse.json({ inventory: inventoryData, alerts });
    }

    if (action === "predict") {
      // Use Cohere to predict restocking needs
      const lowStockItems = inventoryData.filter(item => item.quantity < item.threshold);
      
      if (lowStockItems.length === 0) {
        return NextResponse.json({
          prediction: "All inventory levels are healthy. No immediate restocking needed.",
          items: [],
        });
      }

      const prompt = `Based on the following low stock items, provide a brief restocking recommendation:
${lowStockItems.map(item => `- ${item.name}: ${item.quantity} units (threshold: ${item.threshold})`).join("\n")}

Provide a concise recommendation for restocking priorities.`;

      const recommendation = await generateText(prompt, { maxTokens: 200 });

      return NextResponse.json({
        prediction: recommendation,
        items: lowStockItems,
      });
    }

    if (action === "update" && itemId) {
      const item = inventoryData.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      
      item.quantity = quantity;
      return NextResponse.json({ success: true, item });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Inventory API error:", error);
    return NextResponse.json(
      { error: "Failed to process inventory request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const alerts = inventoryData.filter(item => item.quantity < item.threshold);
  return NextResponse.json({ inventory: inventoryData, alerts });
}
