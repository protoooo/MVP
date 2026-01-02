import { query } from '../config/database';
import { cohereService } from './cohereService';

export const searchService = {
  // Perform natural language search
  async search(queryText: string, userId: number) {
    try {
      // 1. Parse query using Command-R7b
      const queryParsing = await cohereService.parseSearchQuery(queryText);

      // 2. Generate query embedding
      const queryEmbedding = await cohereService.generateQueryEmbedding(queryText);

      // 3. Build SQL query with filters
      let sqlQuery = `
        SELECT f.*, fc.extracted_text, fm.tags, fm.category, fm.ai_description,
               COALESCE(1 - (fc.text_embedding <=> $1::vector), 0) AS similarity_score
        FROM files f
        LEFT JOIN file_content fc ON f.id = fc.file_id
        LEFT JOIN file_metadata fm ON f.id = fm.file_id
        WHERE f.user_id = $2
      `;

      const params: any[] = [JSON.stringify(queryEmbedding), userId];
      let paramIndex = 3;

      // Add time range filter
      if (queryParsing.timeRange) {
        if (queryParsing.timeRange.start) {
          sqlQuery += ` AND f.uploaded_at >= $${paramIndex}`;
          params.push(queryParsing.timeRange.start);
          paramIndex++;
        }
        if (queryParsing.timeRange.end) {
          sqlQuery += ` AND f.uploaded_at <= $${paramIndex}`;
          params.push(queryParsing.timeRange.end);
          paramIndex++;
        }
      }

      // Add document type filter
      if (queryParsing.documentTypes.length > 0) {
        sqlQuery += ` AND (fm.tags && $${paramIndex}::text[] OR fm.category = ANY($${paramIndex}::text[]))`;
        params.push(queryParsing.documentTypes);
        paramIndex++;
      }

      sqlQuery += ` ORDER BY similarity_score DESC NULLS LAST LIMIT 50`;

      const results = await query(sqlQuery, params);

      // If no results found, return early
      if (!results.rows || results.rows.length === 0) {
        await query(
          `INSERT INTO search_logs (user_id, query, results_count, searched_at)
           VALUES ($1, $2, $3, NOW())`,
          [userId, queryText, 0]
        );

        return {
          results: [],
          total: 0,
          query_understanding: queryParsing,
        };
      }

      // 4. Rerank results using Cohere Rerank v4.0 Pro (only if we have results)
      const documentsForRerank = results.rows.map(row => ({
        id: row.id.toString(),
        text: `${row.original_filename} ${row.ai_description || ''} ${row.extracted_text?.substring(0, 500) || ''} ${
          row.tags?.join(' ') || ''
        }`,
      }));

      const rerankedResults = await cohereService.rerankResults(queryText, documentsForRerank);

      // 5. Reorder results based on rerank scores
      const finalResults = rerankedResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(rr => {
          const originalRow = results.rows.find(row => row.id.toString() === rr.id);
          return {
            ...originalRow,
            relevance_score: rr.relevanceScore,
          };
        });

      // 6. Log search for analytics
      await query(
        `INSERT INTO search_logs (user_id, query, results_count, searched_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, queryText, finalResults.length]
      );

      return {
        results: finalResults.slice(0, 20), // Return top 20
        total: finalResults.length,
        query_understanding: queryParsing,
      };
    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  },

  // Get search suggestions
  async getSuggestions(userId: number) {
    // Get recent searches
    const recentSearches = await query(
      `SELECT DISTINCT query FROM search_logs
       WHERE user_id = $1
       ORDER BY searched_at DESC
       LIMIT 5`,
      [userId]
    );

    return {
      recent: recentSearches.rows.map(r => r.query),
      examples: [
        'Show me tax documents from 2018',
        'Find before photos of the Johnson property',
        'Get all invoices over $5000',
        'Show me employee training documents',
        'Find expense receipts from last quarter',
      ],
    };
  },
};
