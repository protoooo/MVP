import { NextRequest, NextResponse } from "next/server";
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientName, items, dueDate, notes } = body;

    if (!clientName || !items) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse items
    const itemLines = items.split('\n').filter((line: string) => line.trim());
    
    // Create prompt for AI to structure invoice items
    const prompt = `Parse the following invoice line items and calculate totals:

Client: ${clientName}
Due Date: ${dueDate || 'Net 30'}
Line Items:
${itemLines.join('\n')}

${notes ? `Payment Terms: ${notes}` : ''}

For each line item, extract:
- Description
- Quantity (default to 1 if not specified)
- Rate/Price per unit
- Calculate the amount (quantity * rate)

Then calculate:
- Subtotal (sum of all amounts)
- Tax (assume 8% sales tax)
- Total (subtotal + tax)

Format the result as a JSON object with this structure:
{
  "invoiceNumber": "INV-[random 4 digits]",
  "date": "[today's date]",
  "dueDate": "[due date]",
  "clientName": "[client name]",
  "items": [
    {"description": "...", "quantity": 1, "rate": 100, "amount": 100}
  ],
  "subtotal": [number],
  "taxRate": 8,
  "tax": [number],
  "total": [number],
  "notes": "[payment terms]"
}`;

    const response = await cohere.generate({
      prompt,
      maxTokens: 1500,
      temperature: 0.3,
      model: "command",
    });

    const generatedText = response.generations[0]?.text || "";

    // Try to extract JSON from response
    let invoiceData;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        invoiceData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback to manual parsing
    }

    if (!invoiceData) {
      // Fallback: Create simple invoice structure
      const parsedItems = itemLines.map((line: string) => {
        const parts = line.split(',');
        const description = parts[0]?.trim() || line;
        const priceMatch = line.match(/\$?(\d+(?:\.\d{2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
        
        return {
          description,
          quantity: 1,
          rate: price,
          amount: price
        };
      });

      const subtotal = parsedItems.reduce((sum, item) => sum + item.amount, 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      invoiceData = {
        invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString(),
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        clientName,
        items: parsedItems,
        subtotal,
        taxRate: 8,
        tax,
        total,
        notes: notes || 'Payment due within 30 days'
      };
    }

    return NextResponse.json({
      invoice: invoiceData,
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
