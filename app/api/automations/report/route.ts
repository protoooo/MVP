import { NextRequest, NextResponse } from "next/server";
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportType, timeframe, dataSource, sections } = body;

    if (!reportType || !dataSource) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Report type templates
    const reportTemplates: Record<string, string> = {
      weekly_operations: "Weekly Operations Report",
      monthly_financial: "Monthly Financial Report",
      quarterly_performance: "Quarterly Performance Report",
      annual_summary: "Annual Summary Report",
      sales_report: "Sales Performance Report",
      customer_analysis: "Customer Analysis Report",
      inventory_report: "Inventory Status Report",
      employee_performance: "Employee Performance Report",
      marketing_metrics: "Marketing Metrics Report",
      project_status: "Project Status Report",
    };

    const reportTitle = reportTemplates[reportType] || reportType;

    // Create prompt for AI
    const prompt = `Generate a comprehensive business report with the following details:

Report Type: ${reportTitle}
Timeframe: ${timeframe}
Data/Context: ${dataSource}
${sections ? `Sections to Include: ${sections}` : ''}

Create a professional business report that includes:
1. Executive Summary
2. Key Metrics and Performance Indicators
3. Detailed Analysis
4. Insights and Trends
5. Recommendations

Format the report with clear sections, data points, and actionable insights based on the provided context.

Structure the output as JSON with this format:
{
  "title": "${reportTitle}",
  "subtitle": "${timeframe}",
  "date": "[current date]",
  "sections": [
    {
      "title": "Executive Summary",
      "content": "..."
    },
    {
      "title": "Key Metrics",
      "metrics": [
        {"label": "Metric Name", "value": "Value", "change": 5}
      ]
    },
    {
      "title": "Analysis",
      "content": "..."
    }
  ]
}`;

    const response = await cohere.generate({
      prompt,
      maxTokens: 2500,
      temperature: 0.7,
      model: "command",
    });

    const generatedText = response.generations[0]?.text || "";

    // Try to extract JSON from response
    let reportData;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback to text format
    }

    if (!reportData) {
      // Fallback: Return as text-based report
      reportData = {
        title: reportTitle,
        subtitle: timeframe,
        date: new Date().toLocaleDateString(),
        sections: [
          {
            title: "Report",
            content: generatedText
          }
        ]
      };
    }

    return NextResponse.json({
      report: reportData,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
