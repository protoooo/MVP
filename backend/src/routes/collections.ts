import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// List all collections for user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT c.*, cs.file_count, cs.total_size, cs.last_updated
       FROM collections c
       LEFT JOIN collection_stats cs ON c.id = cs.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user!.id]
    );

    res.json({ collections: result.rows });
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({ error: 'Error listing collections' });
  }
});

// Get single collection with files
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const collectionId = parseInt(req.params.id);

    const collectionResult = await query(
      `SELECT c.*, cs.file_count, cs.total_size
       FROM collections c
       LEFT JOIN collection_stats cs ON c.id = cs.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [collectionId, req.user!.id]
    );

    if (collectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const filesResult = await query(
      `SELECT f.*, fm.tags, fm.category, fm.ai_description, cf.added_at
       FROM files f
       LEFT JOIN file_metadata fm ON f.id = fm.file_id
       INNER JOIN collection_files cf ON f.id = cf.file_id
       WHERE cf.collection_id = $1
       ORDER BY cf.added_at DESC`,
      [collectionId]
    );

    res.json({
      collection: collectionResult.rows[0],
      files: filesResult.rows,
    });
  } catch (error) {
    console.error('Error getting collection:', error);
    res.status(500).json({ error: 'Error getting collection' });
  }
});

// Create new collection
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, color, icon, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const result = await query(
      `INSERT INTO collections (user_id, name, description, color, icon, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user!.id,
        name,
        description || null,
        color || '#3ECF8E',
        icon || 'folder',
        parentId || null,
      ]
    );

    res.json({ collection: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating collection:', error);
    
    if (error.constraint === 'unique_collection_name_per_user') {
      return res.status(400).json({ error: 'A collection with this name already exists' });
    }
    
    res.status(500).json({ error: 'Error creating collection' });
  }
});

// Update collection
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const { name, description, color, icon } = req.body;

    const result = await query(
      `UPDATE collections 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           icon = COALESCE($4, icon),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, description, color, icon, collectionId, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json({ collection: result.rows[0] });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Error updating collection' });
  }
});

// Delete collection
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const collectionId = parseInt(req.params.id);

    const result = await query(
      `DELETE FROM collections 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [collectionId, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Error deleting collection' });
  }
});

// Add file to collection
router.post('/:id/files', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Verify collection belongs to user
    const collectionCheck = await query(
      'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
      [collectionId, req.user!.id]
    );

    if (collectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Verify file belongs to user
    const fileCheck = await query(
      'SELECT id FROM files WHERE id = $1 AND user_id = $2',
      [fileId, req.user!.id]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Add file to collection
    await query(
      `INSERT INTO collection_files (collection_id, file_id, added_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (collection_id, file_id) DO NOTHING`,
      [collectionId, fileId, req.user!.id]
    );

    res.json({ message: 'File added to collection' });
  } catch (error) {
    console.error('Error adding file to collection:', error);
    res.status(500).json({ error: 'Error adding file to collection' });
  }
});

// Remove file from collection
router.delete('/:id/files/:fileId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);

    // Verify collection belongs to user
    const collectionCheck = await query(
      'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
      [collectionId, req.user!.id]
    );

    if (collectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    await query(
      'DELETE FROM collection_files WHERE collection_id = $1 AND file_id = $2',
      [collectionId, fileId]
    );

    res.json({ message: 'File removed from collection' });
  } catch (error) {
    console.error('Error removing file from collection:', error);
    res.status(500).json({ error: 'Error removing file from collection' });
  }
});

// Bulk add files to collection
router.post('/:id/files/bulk', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'File IDs array is required' });
    }

    // Verify collection belongs to user
    const collectionCheck = await query(
      'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
      [collectionId, req.user!.id]
    );

    if (collectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Bulk insert
    const values = fileIds.map((fileId, idx) => 
      `($1, $${idx + 2}, $${fileIds.length + 2})`
    ).join(',');

    await query(
      `INSERT INTO collection_files (collection_id, file_id, added_by)
       VALUES ${values}
       ON CONFLICT (collection_id, file_id) DO NOTHING`,
      [collectionId, ...fileIds, req.user!.id]
    );

    res.json({ message: `${fileIds.length} files added to collection` });
  } catch (error) {
    console.error('Error bulk adding files:', error);
    res.status(500).json({ error: 'Error adding files to collection' });
  }
});

export default router;
