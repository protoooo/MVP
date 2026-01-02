"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import AutomationBlock from "./AutomationBlock";

interface InvoiceBuilderBlockProps {
  content: Record<string, any>;
  onUpdate: (content: Record<string, any>) => void;
}

export default function InvoiceBuilderBlock({
  content,
  onUpdate
}: InvoiceBuilderBlockProps) {
  const [clientName, setClientName] = useState(content.inputs?.clientName || "");
  const [items, setItems] = useState(content.inputs?.items || "");
  const [dueDate, setDueDate] = useState(content.inputs?.dueDate || "");
  const [notes, setNotes] = useState(content.inputs?.notes || "");

  const handleGenerate = async (inputs: Record<string, any>) => {
    const response = await fetch("/api/automations/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs)
    });

    if (!response.ok) {
      throw new Error("Failed to generate invoice");
    }

    const data = await response.json();
    return data.invoice;
  };

  const renderConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Client Name
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Enter client or company name"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Line Items
        </label>
        <textarea
          value={items}
          onChange={(e) => setItems(e.target.value)}
          placeholder="Enter items (one per line):&#10;Consulting Services, $150/hr, 10 hours&#10;Web Development, $5,000&#10;Domain Registration, $15"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={6}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Due Date
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Notes / Payment Terms (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., 'Payment due within 30 days', 'Net 15', etc."
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={3}
        />
      </div>

      <button
        onClick={() => handleGenerate({
          clientName,
          items,
          dueDate,
          notes
        })}
        disabled={!clientName || !items}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate Invoice
      </button>
    </div>
  );

  const renderOutput = () => {
    const output = content.output;
    
    if (typeof output === 'object' && output.items) {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-4">
            <h2 className="text-2xl font-bold text-text-primary mb-2">INVOICE</h2>
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-semibold text-text-primary">{output.invoiceNumber}</div>
                <div className="text-text-secondary">Date: {output.date}</div>
                <div className="text-text-secondary">Due: {output.dueDate}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-text-primary">Bill To:</div>
                <div className="text-text-secondary">{output.clientName}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold text-text-primary">Description</th>
                  <th className="text-right py-2 font-semibold text-text-primary">Quantity</th>
                  <th className="text-right py-2 font-semibold text-text-primary">Rate</th>
                  <th className="text-right py-2 font-semibold text-text-primary">Amount</th>
                </tr>
              </thead>
              <tbody>
                {output.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="py-3 text-text-primary">{item.description}</td>
                    <td className="py-3 text-right text-text-secondary">{item.quantity}</td>
                    <td className="py-3 text-right text-text-secondary">${item.rate.toFixed(2)}</td>
                    <td className="py-3 text-right font-medium text-text-primary">
                      ${item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Subtotal:</span>
                <span className="text-text-primary">${output.subtotal.toFixed(2)}</span>
              </div>
              {output.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Tax ({output.taxRate}%):</span>
                  <span className="text-text-primary">${output.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span className="text-text-primary">Total:</span>
                <span className="text-text-primary">${output.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {output.notes && (
            <div className="bg-background-secondary rounded-md p-4 mt-4">
              <div className="text-xs font-medium text-text-tertiary mb-1">Payment Terms</div>
              <div className="text-sm text-text-primary">{output.notes}</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap text-sm text-text-primary">
          {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
        </div>
      </div>
    );
  };

  return (
    <AutomationBlock
      title="Invoice Builder"
      description="Create professional invoices instantly"
      icon={Receipt}
      content={content}
      onUpdate={onUpdate}
      onGenerate={handleGenerate}
      renderConfig={renderConfig}
      renderOutput={renderOutput}
      estimatedTime="15 seconds"
      timeSaved="20m"
      hourlyRate={50}
    />
  );
}
