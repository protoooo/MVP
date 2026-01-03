import { query } from '../config/database';
import { cohereService } from './cohereService';

export const searchService = {
  // Perform natural language search with answer extraction
  async search(queryText: string, userId: number) {
    try {
      console.log(`\n=== Starting search: "${queryText}" ===`);
      
      // 1. Parse query using Command-R7b
      console.log('Parsing query...');
      const queryParsing = await cohereService.parseSearchQuery(queryText);
      console.log('Query parsed:', JSON.stringify(queryParsing, null, 2));

      // 2. Generate query embedding
      console.log('Generating query embedding...');
      const queryEmbedding = await cohereService.generateQueryEmbedding(queryText);
      console.log(`✓ Query embedding generated: ${queryEmbedding.length} dimensions`);

      // ✅ FIX: Convert embedding array to pgvector format '[1,2,3,...]'
      const embeddingString = `[${queryEmbedding.join(',')}]`;

      // 3. Build HYBRID SQL query (vector + keyword + metadata)
      let sqlQuery = `
        SELECT DISTINCT f.*, fc.extracted_text, fm.tags, fm.category, fm.ai_description,
               COALESCE(1 - (fc.text_embedding <=> $1::vector), 0) AS vector_score,
               CASE 
                 WHEN LOWER(f.original_filename) LIKE $3 THEN 0.3
                 ELSE 0.0
               END AS filename_score,
               CASE
                 WHEN fm.tags && $4::text[] THEN 0.2
                 ELSE 0.0
               END AS tag_score,
               (
                 COALESCE(1 - (fc.text_embedding <=> $1::vector), 0) +
                 CASE WHEN LOWER(f.original_filename) LIKE $3 THEN 0.3 ELSE 0.0 END +
                 CASE WHEN fm.tags && $4::text[] THEN 0.2 ELSE 0.0 END
               ) AS hybrid_score
        FROM files f
        LEFT JOIN file_content fc ON f.id = fc.file_id
        LEFT JOIN file_metadata fm ON f.id = fm.file_id
        WHERE f.user_id = $2
      `;

      // Extract keywords for hybrid search
      const keywords = queryParsing.keywords.concat(queryText.toLowerCase().split(' ').filter(w => w.length > 2));
      const keywordPattern = `%${keywords.join('%')}%`;
      const searchTags = [...new Set(keywords.concat(queryParsing.documentTypes))];

      const params: any[] = [
        embeddingString,  // ✅ Now using proper pgvector format
        userId,
        keywordPattern,
        searchTags,
      ];
      let paramIndex = 5;

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

      sqlQuery += ` ORDER BY hybrid_score DESC NULLS LAST LIMIT 50`;

      console.log('Executing hybrid search query...');
      console.log('SQL Query:', sqlQuery);
      console.log('Params:', params.map((p, i) => i === 0 ? '[EMBEDDING_VECTOR]' : p));
      
      const results = await query(sqlQuery, params);
      console.log(`✓ Found ${results.rows.length} documents`);

      // If no results found, return early
      if (!results.rows || results.rows.length === 0) {
        console.log('No results found');
        await query(
          `INSERT INTO search_logs (user_id, query, results_count, searched_at)
           VALUES ($1, $2, $3, NOW())`,
          [userId, queryText, 0]
        );

        return {
          results: [],
          total: 0,
          query_understanding: queryParsing,
          extractedAnswer: null,
        };
      }

      // Log first few results for debugging
      console.log('\nTop 3 results:');
      results.rows.slice(0, 3).forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.original_filename} (score: ${row.hybrid_score?.toFixed(3)})`);
      });

      // 4. Rerank results using Cohere Rerank v4.0 Pro
      const documentsForRerank = results.rows.map(row => ({
        id: row.id.toString(),
        text: `${row.original_filename} ${row.ai_description || ''} ${row.extracted_text?.substring(0, 500) || ''} ${
          row.tags?.join(' ') || ''
        }`,
      }));

      console.log('\nReranking results...');
      const rerankedResults = await cohereService.rerankResults(queryText, documentsForRerank);
      console.log('✓ Reranking complete');

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

      console.log('\nTop 3 after reranking:');
      finalResults.slice(0, 3).forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.original_filename} (relevance: ${row.relevance_score?.toFixed(3)})`);
      });

      // 6. Extract answer from top documents
      console.log('\nExtracting answer from top documents...');
      const topDocsForExtraction = finalResults.slice(0, 5).map(doc => ({
        filename: doc.original_filename,
        content: doc.extracted_text || doc.ai_description || '',
        metadata: {
          category: doc.category,
          tags: doc.tags,
          date: doc.uploaded_at,
        },
      }));

      const extractedAnswer = await cohereService.extractAnswer(queryText, topDocsForExtraction);
      console.log(`✓ Answer extracted (has direct answer: ${extractedAnswer.hasDirectAnswer})`);
      if (extractedAnswer.hasDirectAnswer) {
        console.log(`  Answer: ${extractedAnswer.answer.substring(0, 100)}...`);
      }

      // 7. Log search for analytics
      await query(
        `INSERT INTO search_logs (user_id, query, results_count, searched_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, queryText, finalResults.length]
      );

      console.log(`\n=== Search complete: ${finalResults.length} results ===\n`);

      return {
        results: finalResults.slice(0, 20), // Return top 20
        total: finalResults.length,
        query_understanding: queryParsing,
        extractedAnswer: extractedAnswer.hasDirectAnswer ? extractedAnswer : null,
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
        'What were my capital gains in 2017?',
        'Show me expense totals for Q2 2023',
        'Who approved the safety protocol?',
        'What are our hours according to the employee handbook?',
        'Find all invoices over $5000',
      ],
    };
  },
};
