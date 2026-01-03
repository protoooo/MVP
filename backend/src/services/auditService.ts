import { query } from '../config/database';
import { Request } from 'express';

export type AuditAction = 
  | 'user.login' 
  | 'user.logout' 
  | 'user.created' 
  | 'user.deleted'
  | 'file.uploaded' 
  | 'file.viewed' 
  | 'file.downloaded' 
  | 'file.deleted'
  | 'file.shared'
  | 'workspace.created'
  | 'workspace.deleted'
  | 'permission.granted'
  | 'permission.revoked'
  | 'search.performed'
  | 'export.generated'
  | 'settings.changed';

export type ResourceType = 
  | 'user' 
  | 'file' 
  | 'workspace' 
  | 'organization' 
  | 'permission'
  | 'search';

interface AuditLogEntry {
  organizationId: number;
  userId: number | null;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export const auditService = {
  // Log an audit event
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs 
         (organization_id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.organizationId,
          entry.userId,
          entry.action,
          entry.resourceType,
          entry.resourceId || null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
        ]
      );
    } catch (error) {
      // Don't let audit logging failures break the app
      console.error('Failed to log audit event:', error);
    }
  },

  // Helper to extract request metadata
  extractRequestMetadata(req: Request): { ipAddress: string; userAgent: string } {
    return {
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                 req.socket.remoteAddress || 
                 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
  },

  // Get audit logs for an organization
  async getOrganizationLogs(
    organizationId: number,
    options: {
      userId?: number;
      action?: AuditAction;
      resourceType?: ResourceType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ logs: any[]; total: number }> {
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (options.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(options.userId);
      paramIndex++;
    }

    if (options.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(options.action);
      paramIndex++;
    }

    if (options.resourceType) {
      conditions.push(`resource_type = $${paramIndex}`);
      params.push(options.resourceType);
      paramIndex++;
    }

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(options.endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get logs
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const logsResult = await query(
      `SELECT al.*, u.email as user_email, u.full_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      logs: logsResult.rows,
      total,
    };
  },

  // Get audit logs for a specific file
  async getFileLogs(fileId: number, limit: number = 50): Promise<any[]> {
    const result = await query(
      `SELECT al.*, u.email as user_email, u.full_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.resource_type = 'file' AND al.resource_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [fileId, limit]
    );

    return result.rows;
  },

  // Get user activity
  async getUserActivity(
    userId: number,
    organizationId: number,
    days: number = 30
  ): Promise<{
    totalActions: number;
    actionBreakdown: Record<string, number>;
    recentActions: any[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total and breakdown
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total_actions,
         jsonb_object_agg(action, action_count) as action_breakdown
       FROM (
         SELECT action, COUNT(*) as action_count
         FROM audit_logs
         WHERE user_id = $1 
         AND organization_id = $2
         AND created_at >= $3
         GROUP BY action
       ) subquery`,
      [userId, organizationId, startDate]
    );

    // Get recent actions
    const recentResult = await query(
      `SELECT * FROM audit_logs
       WHERE user_id = $1 
       AND organization_id = $2
       AND created_at >= $3
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, organizationId, startDate]
    );

    return {
      totalActions: parseInt(statsResult.rows[0]?.total_actions || 0),
      actionBreakdown: statsResult.rows[0]?.action_breakdown || {},
      recentActions: recentResult.rows,
    };
  },

  // Export audit logs (for compliance)
  async exportLogs(
    organizationId: number,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const result = await query(
      `SELECT 
         al.*,
         u.email as user_email,
         u.full_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.organization_id = $1
       AND al.created_at >= $2
       AND al.created_at <= $3
       ORDER BY al.created_at DESC`,
      [organizationId, startDate, endDate]
    );

    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'timestamp',
        'user_email',
        'user_name',
        'action',
        'resource_type',
        'resource_id',
        'ip_address',
      ];
      
      const rows = result.rows.map(row => [
        row.created_at,
        row.user_email || '',
        row.user_name || '',
        row.action,
        row.resource_type,
        row.resource_id || '',
        row.ip_address || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return csv;
    } else {
      // Return as JSON
      return JSON.stringify(result.rows, null, 2);
    }
  },

  // Generate compliance report
  async generateComplianceReport(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: Date; end: Date };
    summary: {
      totalActions: number;
      uniqueUsers: number;
      fileUploads: number;
      fileDownloads: number;
      fileDeletions: number;
      permissionChanges: number;
    };
    topUsers: Array<{ userId: number; email: string; actionCount: number }>;
    securityEvents: any[];
  }> {
    // Summary statistics
    const summaryResult = await query(
      `SELECT 
         COUNT(*) as total_actions,
         COUNT(DISTINCT user_id) as unique_users,
         COUNT(*) FILTER (WHERE action = 'file.uploaded') as file_uploads,
         COUNT(*) FILTER (WHERE action = 'file.downloaded') as file_downloads,
         COUNT(*) FILTER (WHERE action = 'file.deleted') as file_deletions,
         COUNT(*) FILTER (WHERE action IN ('permission.granted', 'permission.revoked')) as permission_changes
       FROM audit_logs
       WHERE organization_id = $1
       AND created_at >= $2
       AND created_at <= $3`,
      [organizationId, startDate, endDate]
    );

    // Top users by activity
    const topUsersResult = await query(
      `SELECT 
         al.user_id,
         u.email,
         COUNT(*) as action_count
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.organization_id = $1
       AND al.created_at >= $2
       AND al.created_at <= $3
       GROUP BY al.user_id, u.email
       ORDER BY action_count DESC
       LIMIT 10`,
      [organizationId, startDate, endDate]
    );

    // Security-relevant events
    const securityEventsResult = await query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.organization_id = $1
       AND al.created_at >= $2
       AND al.created_at <= $3
       AND al.action IN ('file.deleted', 'permission.granted', 'permission.revoked', 'user.deleted')
       ORDER BY al.created_at DESC`,
      [organizationId, startDate, endDate]
    );

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalActions: parseInt(summaryResult.rows[0].total_actions),
        uniqueUsers: parseInt(summaryResult.rows[0].unique_users),
        fileUploads: parseInt(summaryResult.rows[0].file_uploads),
        fileDownloads: parseInt(summaryResult.rows[0].file_downloads),
        fileDeletions: parseInt(summaryResult.rows[0].file_deletions),
        permissionChanges: parseInt(summaryResult.rows[0].permission_changes),
      },
      topUsers: topUsersResult.rows,
      securityEvents: securityEventsResult.rows,
    };
  },
};
