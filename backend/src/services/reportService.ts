import { cohereService } from './cohereService';
import { query } from '../config/database';

export interface ReportSection {
  title: string;
  content: string;
  citations: Array<{
    filename: string;
    excerpt: string;
  }>;
}

export interface GeneratedReport {
  title: string;
  summary: string;
  sections: ReportSection[];
  metadata: {
    generatedAt: string;
    documentCount: number;
    timeRange?: { start: string; end: string };
    queryContext: string;
  };
}

export const reportService = {
  // Generate comprehensive report from documents
  async generateReport(
    reportQuery: string,
    documentIds: number[],
    userId: number,
    reportType: 'summary' | 'analysis' | 'comparison' | 'timeline' = 'summary'
  ): Promise<GeneratedReport> {
    try {
      console.log(`\n=== Generating ${reportType} report ===`);
      console.log(`Query: "${reportQuery}"`);
      console.log(`Documents: ${documentIds.length}`);

      // 1. Fetch documents
      const documents = await this.fetchDocuments(documentIds, userId);
      
      if (documents.length === 0) {
        throw new Error('No documents found for report generation');
      }

      // 2. Generate report based on type
      let report: GeneratedReport;

      switch (reportType) {
        case 'analysis':
          report = await this.generateAnalysisReport(reportQuery, documents);
          break;
        case 'comparison':
          report = await this.generateComparisonReport(reportQuery, documents);
          break;
        case 'timeline':
          report = await this.generateTimelineReport(reportQuery, documents);
          break;
        default:
          report = await this.generateSummaryReport(reportQuery, documents);
      }

      // 3. Log report generation
      await query(
        `INSERT INTO search_logs (user_id, query, results_count, searched_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, `[REPORT] ${reportQuery}`, documents.length]
      );

      console.log('✓ Report generated successfully');
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  // Fetch documents for report
  async fetchDocuments(documentIds: number[], userId: number) {
    const placeholders = documentIds.map((_, idx) => `$${idx + 2}`).join(',');
    
    const result = await query(
      `SELECT f.*, fc.extracted_text, fm.tags, fm.category, fm.ai_description
       FROM files f
       LEFT JOIN file_content fc ON f.id = fc.file_id
       LEFT JOIN file_metadata fm ON f.id = fm.file_id
       WHERE f.user_id = $1 AND f.id IN (${placeholders})
       ORDER BY f.uploaded_at DESC`,
      [userId, ...documentIds]
    );

    return result.rows.map(row => ({
      id: row.id,
      filename: row.original_filename,
      content: row.extracted_text || row.ai_description || '',
      category: row.category,
      tags: row.tags || [],
      uploadedAt: row.uploaded_at,
      fileType: row.file_type,
    }));
  },

  // Generate summary report
  async generateSummaryReport(query: string, documents: any[]): Promise<GeneratedReport> {
    const documentContext = documents
      .map(
        (doc, idx) =>
          `[Document ${idx + 1}: ${doc.filename}]
Category: ${doc.category || 'N/A'}
Date: ${new Date(doc.uploadedAt).toLocaleDateString()}
Content: ${doc.content.substring(0, 2500)}
---`
      )
      .join('\n\n');

    const prompt = `You are an expert business analyst creating a comprehensive summary report.

Topic: "${query}"

Documents (${documents.length} total):
${documentContext}

Create a detailed summary report with the following structure:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
   - Key findings and takeaways
   - Most important data points
   - High-level overview

2. KEY FINDINGS (4-6 bullet points)
   - Main insights from the documents
   - Important numbers, dates, names
   - Critical patterns or trends

3. DETAILED ANALYSIS (3-5 paragraphs)
   - Deeper dive into the data
   - Context and interpretation
   - Connections between documents

4. RECOMMENDATIONS (3-5 bullet points)
   - Actionable next steps
   - Areas needing attention
   - Opportunities identified

5. DATA SOURCES
   - List all documents referenced with key excerpts

Format your response as JSON:
{
  "title": "Report title",
  "summary": "Executive summary text",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content with analysis",
      "citations": [
        {
          "filename": "document.pdf",
          "excerpt": "relevant excerpt"
        }
      ]
    }
  ]
}

Be specific with numbers, dates, and names. Always cite your sources.`;

    const response = await cohereService.generateText(prompt);
    return this.parseReportResponse(response, query, documents);
  },

  // Generate analysis report (deeper insights)
  async generateAnalysisReport(query: string, documents: any[]): Promise<GeneratedReport> {
    const documentContext = documents
      .map(
        (doc, idx) =>
          `[Document ${idx + 1}: ${doc.filename}]
Category: ${doc.category || 'N/A'}
Date: ${new Date(doc.uploadedAt).toLocaleDateString()}
Content: ${doc.content.substring(0, 2500)}
---`
      )
      .join('\n\n');

    const prompt = `You are an expert business analyst conducting deep analysis.

Analysis Focus: "${query}"

Documents (${documents.length} total):
${documentContext}

Provide a comprehensive analytical report with:

1. SITUATION ANALYSIS
   - Current state assessment
   - Key metrics and KPIs
   - Historical context

2. TREND ANALYSIS
   - Patterns over time
   - Growth or decline indicators
   - Comparative analysis

3. RISK ASSESSMENT
   - Potential issues identified
   - Areas of concern
   - Risk mitigation strategies

4. OPPORTUNITY ANALYSIS
   - Growth opportunities
   - Optimization potential
   - Strategic recommendations

5. FINANCIAL IMPLICATIONS (if applicable)
   - Cost analysis
   - Revenue impact
   - ROI considerations

Format as JSON with title, summary, and sections with citations.`;

    const response = await cohereService.generateText(prompt);
    return this.parseReportResponse(response, query, documents);
  },

  // Generate comparison report
  async generateComparisonReport(query: string, documents: any[]): Promise<GeneratedReport> {
    const documentContext = documents
      .map(
        (doc, idx) =>
          `[Document ${idx + 1}: ${doc.filename}]
Category: ${doc.category || 'N/A'}
Date: ${new Date(doc.uploadedAt).toLocaleDateString()}
Content: ${doc.content.substring(0, 2500)}
---`
      )
      .join('\n\n');

    const prompt = `You are an expert analyst creating a comparison report.

Comparison Topic: "${query}"

Documents to Compare (${documents.length} total):
${documentContext}

Create a detailed comparison report:

1. OVERVIEW
   - What is being compared
   - Time periods or entities
   - Key metrics

2. SIDE-BY-SIDE COMPARISON
   - Direct comparisons of key data points
   - Percentage changes
   - Significant differences

3. ADVANTAGES & DISADVANTAGES
   - Pros and cons of each element
   - Strengths and weaknesses
   - Trade-offs identified

4. PERFORMANCE METRICS
   - Quantitative comparisons
   - Benchmark analysis
   - Relative performance

5. CONCLUSIONS & RECOMMENDATIONS
   - Which option is better and why
   - Context-dependent recommendations
   - Decision framework

Format as JSON with title, summary, and sections with citations.`;

    const response = await cohereService.generateText(prompt);
    return this.parseReportResponse(response, query, documents);
  },

  // Generate timeline report
  async generateTimelineReport(query: string, documents: any[]): Promise<GeneratedReport> {
    // Sort documents by date
    const sortedDocs = [...documents].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );

    const documentContext = sortedDocs
      .map(
        (doc, idx) =>
          `[${new Date(doc.uploadedAt).toLocaleDateString()}: ${doc.filename}]
Category: ${doc.category || 'N/A'}
Content: ${doc.content.substring(0, 2500)}
---`
      )
      .join('\n\n');

    const prompt = `You are an expert analyst creating a timeline-based report.

Timeline Topic: "${query}"

Documents in Chronological Order (${documents.length} total):
${documentContext}

Create a timeline report with:

1. TIMELINE OVERVIEW
   - Date range covered
   - Number of events/documents
   - Overall narrative arc

2. CHRONOLOGICAL ANALYSIS
   - Key events in order
   - Changes over time
   - Critical milestones

3. PATTERN IDENTIFICATION
   - Recurring themes
   - Cyclical patterns
   - Trend progression

4. CAUSE & EFFECT
   - How earlier events influenced later ones
   - Decision points and outcomes
   - Consequences over time

5. FUTURE OUTLOOK
   - Based on historical patterns
   - Projected trends
   - What to watch for

Format as JSON with title, summary, and sections with citations.`;

    const response = await cohereService.generateText(prompt);
    return this.parseReportResponse(response, query, documents);
  },

  // Parse Cohere response into structured report
  parseReportResponse(response: string, query: string, documents: any[]): GeneratedReport {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Find time range from documents
        const dates = documents.map(d => new Date(d.uploadedAt).getTime());
        const timeRange =
          dates.length > 0
            ? {
                start: new Date(Math.min(...dates)).toISOString().split('T')[0],
                end: new Date(Math.max(...dates)).toISOString().split('T')[0],
              }
            : undefined;

        return {
          title: parsed.title || `Report: ${query}`,
          summary: parsed.summary || 'Analysis of selected documents',
          sections: parsed.sections || [],
          metadata: {
            generatedAt: new Date().toISOString(),
            documentCount: documents.length,
            timeRange,
            queryContext: query,
          },
        };
      }

      throw new Error('Could not parse JSON from response');
    } catch (error) {
      console.error('Error parsing report response:', error);

      // Fallback: create basic report from text
      return {
        title: `Report: ${query}`,
        summary: response.substring(0, 500),
        sections: [
          {
            title: 'Analysis',
            content: response,
            citations: documents.map(d => ({
              filename: d.filename,
              excerpt: d.content.substring(0, 200),
            })),
          },
        ],
        metadata: {
          generatedAt: new Date().toISOString(),
          documentCount: documents.length,
          queryContext: query,
        },
      };
    }
  },

  // Generate text using Cohere
  async generateText(prompt: string): Promise<string> {
    const response = await cohereService.chat(prompt);
    return response;
  },
};

// Add chat method to cohereService if not exists
declare module './cohereService' {
  interface CohereService {
    chat(message: string): Promise<string>;
  }
}
