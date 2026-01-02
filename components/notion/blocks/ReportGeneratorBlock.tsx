"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import AutomationBlock from "./AutomationBlock";

interface ReportGeneratorBlockProps {
  content: Record<string, any>;
  onUpdate: (content: Record<string, any>) => void;
}

export default function ReportGeneratorBlock({
  content,
  onUpdate
}: ReportGeneratorBlockProps) {
  const [reportType, setReportType] = useState(content.inputs?.reportType || "");
  const [timeframe, setTimeframe] = useState(content.inputs?.timeframe || "");
  const [dataSource, setDataSource] = useState(content.inputs?.dataSource || "");
  const [sections, setSections] = useState(content.inputs?.sections || "");

  const handleGenerate = async (inputs: Record<string, any>) => {
    const response = await fetch("/api/automations/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs)
    });

    if (!response.ok) {
      throw new Error("Failed to generate report");
    }

    const data = await response.json();
    return data.report;
  };

  const renderConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Report Type
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Select report type...</option>
          <option value="weekly_operations">Weekly Operations</option>
          <option value="monthly_financial">Monthly Financial</option>
          <option value="quarterly_performance">Quarterly Performance</option>
          <option value="annual_summary">Annual Summary</option>
          <option value="sales_report">Sales Report</option>
          <option value="customer_analysis">Customer Analysis</option>
          <option value="inventory_report">Inventory Report</option>
          <option value="employee_performance">Employee Performance</option>
          <option value="marketing_metrics">Marketing Metrics</option>
          <option value="project_status">Project Status</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Timeframe
        </label>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="last_week">Last Week</option>
          <option value="last_month">Last Month</option>
          <option value="last_quarter">Last Quarter</option>
          <option value="ytd">Year to Date</option>
          <option value="last_year">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Data Source / Context
        </label>
        <textarea
          value={dataSource}
          onChange={(e) => setDataSource(e.target.value)}
          placeholder="Provide relevant data or context for the report..."
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Sections to Include (optional)
        </label>
        <input
          type="text"
          value={sections}
          onChange={(e) => setSections(e.target.value)}
          placeholder="e.g., Executive Summary, Metrics, Recommendations"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={() => handleGenerate({
          reportType,
          timeframe,
          dataSource,
          sections
        })}
        disabled={!reportType || !dataSource}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate Report
      </button>
    </div>
  );

  const renderOutput = () => {
    const output = content.output;
    
    if (typeof output === 'object' && output.sections) {
      return (
        <div className="space-y-6">
          {output.title && (
            <div className="border-b border-border pb-4">
              <h1 className="text-3xl font-bold text-text-primary mb-2">{output.title}</h1>
              {output.subtitle && (
                <p className="text-sm text-text-secondary">{output.subtitle}</p>
              )}
              {output.date && (
                <p className="text-xs text-text-tertiary mt-1">{output.date}</p>
              )}
            </div>
          )}

          {output.sections.map((section: any, idx: number) => (
            <div key={idx} className="space-y-3">
              <h2 className="text-xl font-semibold text-text-primary">{section.title}</h2>
              {section.content && (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-text-primary">
                    {section.content}
                  </div>
                </div>
              )}
              {section.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                  {section.metrics.map((metric: any, midx: number) => (
                    <div key={midx} className="bg-background-secondary rounded-lg p-4">
                      <div className="text-xs text-text-tertiary mb-1">{metric.label}</div>
                      <div className="text-2xl font-bold text-text-primary">{metric.value}</div>
                      {metric.change && (
                        <div className={`text-xs ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
      title="Report Generator"
      description="Generate comprehensive business reports automatically"
      icon={FileText}
      content={content}
      onUpdate={onUpdate}
      onGenerate={handleGenerate}
      renderConfig={renderConfig}
      renderOutput={renderOutput}
      estimatedTime="45 seconds"
      timeSaved="1h 30m"
      hourlyRate={50}
    />
  );
}
