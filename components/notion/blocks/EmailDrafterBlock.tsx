"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import AutomationBlock from "./AutomationBlock";

interface EmailDrafterBlockProps {
  content: Record<string, any>;
  onUpdate: (content: Record<string, any>) => void;
}

export default function EmailDrafterBlock({
  content,
  onUpdate
}: EmailDrafterBlockProps) {
  const [purpose, setPurpose] = useState(content.inputs?.purpose || "");
  const [recipient, setRecipient] = useState(content.inputs?.recipient || "");
  const [context, setContext] = useState(content.inputs?.context || "");
  const [tone, setTone] = useState(content.inputs?.tone || "professional");

  const handleGenerate = async (inputs: Record<string, any>) => {
    const response = await fetch("/api/automations/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs)
    });

    if (!response.ok) {
      throw new Error("Failed to generate email");
    }

    const data = await response.json();
    return data.email;
  };

  const renderConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Email Purpose
        </label>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Select purpose...</option>
          <option value="customer_inquiry">Customer Inquiry Response</option>
          <option value="meeting_followup">Meeting Follow-up</option>
          <option value="quote_request">Quote Request Response</option>
          <option value="appointment_confirmation">Appointment Confirmation</option>
          <option value="thank_you">Thank You</option>
          <option value="complaint_response">Complaint Response</option>
          <option value="newsletter">Newsletter</option>
          <option value="announcement">Team Announcement</option>
          <option value="cold_outreach">Cold Outreach</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Recipient
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="e.g., Client Name, Team, or specific person"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Context & Details
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Provide relevant details, background information, key points to include..."
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={5}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Tone
        </label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
          <option value="empathetic">Empathetic</option>
          <option value="enthusiastic">Enthusiastic</option>
        </select>
      </div>

      <button
        onClick={() => handleGenerate({
          purpose,
          recipient,
          context,
          tone
        })}
        disabled={!purpose || !context}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Draft Email
      </button>
    </div>
  );

  const renderOutput = () => {
    const output = content.output;
    
    if (typeof output === 'object' && output.subject && output.body) {
      return (
        <div className="space-y-4">
          <div className="bg-background-secondary p-3 rounded-md">
            <div className="text-xs font-medium text-text-tertiary mb-1">Subject</div>
            <div className="text-sm font-semibold text-text-primary">{output.subject}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-text-tertiary mb-2">Body</div>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm text-text-primary">
                {output.body}
              </div>
            </div>
          </div>
          {output.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-4">
              <div className="text-xs font-medium text-amber-900 mb-1">Notes</div>
              <div className="text-sm text-amber-800">{output.notes}</div>
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
      title="Email Drafter"
      description="Generate professional emails for any purpose"
      icon={Mail}
      content={content}
      onUpdate={onUpdate}
      onGenerate={handleGenerate}
      renderConfig={renderConfig}
      renderOutput={renderOutput}
      estimatedTime="20 seconds"
      timeSaved="25m"
      hourlyRate={50}
    />
  );
}
