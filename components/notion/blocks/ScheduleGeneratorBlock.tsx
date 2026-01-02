"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import AutomationBlock from "./AutomationBlock";

interface ScheduleGeneratorBlockProps {
  content: Record<string, any>;
  onUpdate: (content: Record<string, any>) => void;
}

export default function ScheduleGeneratorBlock({
  content,
  onUpdate
}: ScheduleGeneratorBlockProps) {
  const [employees, setEmployees] = useState(content.inputs?.employees || "");
  const [duration, setDuration] = useState(content.inputs?.duration || "week");
  const [shifts, setShifts] = useState(content.inputs?.shifts || "morning,afternoon,evening");
  const [constraints, setConstraints] = useState(content.inputs?.constraints || "");

  const handleGenerate = async (inputs: Record<string, any>) => {
    // Call AI API to generate schedule
    const response = await fetch("/api/automations/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs)
    });

    if (!response.ok) {
      throw new Error("Failed to generate schedule");
    }

    const data = await response.json();
    return data.schedule;
  };

  const renderConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Employees
        </label>
        <textarea
          value={employees}
          onChange={(e) => setEmployees(e.target.value)}
          placeholder="Enter employee names (one per line)&#10;John Smith&#10;Sarah Johnson&#10;Mike Davis"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Duration
        </label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="week">Week</option>
          <option value="2weeks">2 Weeks</option>
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Shift Types
        </label>
        <input
          type="text"
          value={shifts}
          onChange={(e) => setShifts(e.target.value)}
          placeholder="e.g., morning,afternoon,evening"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Constraints & Preferences (optional)
        </label>
        <textarea
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder="e.g., 'No more than 5 days per week', 'Weekends off for John', 'No split shifts'"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={3}
        />
      </div>

      <button
        onClick={() => handleGenerate({
          employees,
          duration,
          shifts,
          constraints
        })}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Generate Schedule
      </button>
    </div>
  );

  const renderOutput = () => {
    const output = content.output;
    if (typeof output === 'string') {
      return (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary">
            {output}
          </pre>
        </div>
      );
    }

    // Render as table if structured data
    if (output.schedule && Array.isArray(output.schedule)) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-semibold text-text-primary">Employee</th>
                {output.days?.map((day: string, idx: number) => (
                  <th key={idx} className="text-left py-2 px-3 font-semibold text-text-primary">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {output.schedule.map((row: any, idx: number) => (
                <tr key={idx} className="border-b border-border hover:bg-background-secondary">
                  <td className="py-2 px-3 font-medium text-text-primary">{row.employee}</td>
                  {row.shifts?.map((shift: string, sidx: number) => (
                    <td key={sidx} className="py-2 px-3 text-text-secondary">{shift || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <pre className="whitespace-pre-wrap text-sm text-text-primary">
        {JSON.stringify(output, null, 2)}
      </pre>
    );
  };

  return (
    <AutomationBlock
      title="Schedule Generator"
      description="Create employee schedules automatically based on your requirements"
      icon={Calendar}
      content={content}
      onUpdate={onUpdate}
      onGenerate={handleGenerate}
      renderConfig={renderConfig}
      renderOutput={renderOutput}
      estimatedTime="30 seconds"
    />
  );
}
