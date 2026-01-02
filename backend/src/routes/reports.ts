import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { reportService } from '../services/reportService';

const router = Router();

// Generate report from documents
router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { query, documentIds, reportType } = req.body;

    if (!query || !documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({ error: 'Query and documentIds are required' });
    }

    if (documentIds.length === 0) {
      return res.status(400).json({ error: 'At least one document must be selected' });
    }

    console.log(`Generating ${reportType || 'summary'} report for user ${req.user!.id}`);
    
    const report = await reportService.generateReport(
      query,
      documentIds,
      req.user!.id,
      reportType || 'summary'
    );

    res.json({ report });
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message || 'Error generating report' });
  }
});

export default router;
