import { query } from '../config/database';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const teamService = {
  /**
   * Create a new team channel
   */
  async createChannel(
    userId: number,
    organizationId: number,
    name: string,
    description?: string,
    isPrivate: boolean = false
  ): Promise<any> {
    try {
      const result = await query(
        `INSERT INTO team_channels (
          user_id, organization_id, name, description, is_private
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [userId, organizationId, name, description, isPrivate]
      );

      // Log channel creation event
      await this.logEvent(result.rows[0].id, userId, 'channel_created', {
        channelName: name,
      });

      return result.rows[0];
    } catch (error: any) {
      console.error('Error creating channel:', error);
      throw new Error(`Failed to create channel: ${error.message}`);
    }
  },

  /**
   * List channels for a user/organization
   */
  async listChannels(userId: number, organizationId?: number): Promise<any[]> {
    try {
      const whereClause = organizationId 
        ? 'WHERE organization_id = $1 OR user_id = $2'
        : 'WHERE user_id = $1';
      
      const params = organizationId ? [organizationId, userId] : [userId];

      const result = await query(
        `SELECT 
          c.*,
          u.email as creator_email,
          (SELECT COUNT(*) FROM team_messages WHERE channel_id = c.id) as message_count,
          (SELECT created_at FROM team_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM team_channels c
        LEFT JOIN users u ON c.user_id = u.id
        ${whereClause}
        ORDER BY c.updated_at DESC`,
        params
      );

      return result.rows;
    } catch (error: any) {
      console.error('Error listing channels:', error);
      throw new Error(`Failed to list channels: ${error.message}`);
    }
  },

  /**
   * Send a message to a channel (with Supabase Realtime broadcast)
   */
  async sendMessage(
    channelId: number,
    userId: number,
    message: string,
    attachments?: any
  ): Promise<any> {
    try {
      // Insert message into database
      const result = await query(
        `INSERT INTO team_messages (
          channel_id, user_id, message, attachments
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [channelId, userId, message, attachments ? JSON.stringify(attachments) : null]
      );

      const newMessage = result.rows[0];

      // Get user info for the message
      const userResult = await query(
        `SELECT email FROM users WHERE id = $1`,
        [userId]
      );

      const messageWithUser = {
        ...newMessage,
        user_email: userResult.rows[0]?.email,
      };

      // Update channel's updated_at
      await query(
        `UPDATE team_channels SET updated_at = NOW() WHERE id = $1`,
        [channelId]
      );

      // Broadcast message via Supabase Realtime if available
      if (supabase) {
        try {
          await supabase
            .channel(`channel-${channelId}`)
            .send({
              type: 'broadcast',
              event: 'new_message',
              payload: messageWithUser,
            });
        } catch (error) {
          console.warn('Supabase broadcast failed (non-critical):', error);
        }
      }

      // Log event
      await this.logEvent(channelId, userId, 'message_sent', {
        messageId: newMessage.id,
      });

      return messageWithUser;
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  },

  /**
   * Get messages for a channel
   */
  async getChannelMessages(
    channelId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const results = await query(
        `SELECT 
          m.*,
          u.email as user_email
        FROM team_messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3`,
        [channelId, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) as total FROM team_messages WHERE channel_id = $1`,
        [channelId]
      );

      return {
        messages: results.rows.reverse(), // Reverse to show oldest first
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      };
    } catch (error: any) {
      console.error('Error getting messages:', error);
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  },

  /**
   * Update a message
   */
  async updateMessage(
    messageId: number,
    userId: number,
    newMessage: string
  ): Promise<any> {
    try {
      const result = await query(
        `UPDATE team_messages 
         SET message = $1, is_edited = true, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [newMessage, messageId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Message not found or access denied');
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('Error updating message:', error);
      throw new Error(`Failed to update message: ${error.message}`);
    }
  },

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number, userId: number): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM team_messages WHERE id = $1 AND user_id = $2 RETURNING id`,
        [messageId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Message not found or access denied');
      }
    } catch (error: any) {
      console.error('Error deleting message:', error);
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  },

  /**
   * Log a team event
   */
  async logEvent(
    channelId: number,
    userId: number,
    eventType: string,
    eventData?: any
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO team_events (channel_id, user_id, event_type, event_data)
         VALUES ($1, $2, $3, $4)`,
        [channelId, userId, eventType, eventData ? JSON.stringify(eventData) : null]
      );
    } catch (error) {
      console.error('Error logging event:', error);
      // Don't throw - event logging is non-critical
    }
  },

  /**
   * Get channel events
   */
  async getChannelEvents(channelId: number, limit: number = 50): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          e.*,
          u.email as user_email
        FROM team_events e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.channel_id = $1
        ORDER BY e.created_at DESC
        LIMIT $2`,
        [channelId, limit]
      );

      return result.rows;
    } catch (error: any) {
      console.error('Error getting events:', error);
      throw new Error(`Failed to get events: ${error.message}`);
    }
  },
};
