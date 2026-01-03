// backend/src/middleware/subscription.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { query } from '../config/database';

export interface SubscriptionRequest extends AuthRequest {
  subscription?: {
    status: string;
    planName: string;
    trialEnd: Date | null;
    currentPeriodEnd: Date | null;
  };
  tosAccepted?: boolean;
}

/**
 * Middleware to check if user has an active subscription
 * Must be used after authMiddleware
 */
export async function requireSubscription(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get subscription status
    const result = await query(
      `SELECT s.*, u.tos_accepted_at
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Subscription required',
        code: 'NO_SUBSCRIPTION',
        message: 'You must have an active subscription to access this feature',
      });
    }

    const subscription = result.rows[0];
    const tosAccepted = !!subscription.tos_accepted_at;

    // Check ToS acceptance
    if (!tosAccepted) {
      return res.status(403).json({
        error: 'Terms of Service must be accepted',
        code: 'TOS_NOT_ACCEPTED',
        message: 'You must accept the Terms of Service to continue',
      });
    }

    // Check subscription status
    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(subscription.status)) {
      return res.status(403).json({
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_INACTIVE',
        message: `Your subscription is ${subscription.status}. Please update your payment method or renew your subscription.`,
        subscriptionStatus: subscription.status,
      });
    }

    // Attach subscription info to request
    req.subscription = {
      status: subscription.status,
      planName: subscription.plan_name,
      trialEnd: subscription.trial_end,
      currentPeriodEnd: subscription.current_period_end,
    };
    req.tosAccepted = tosAccepted;

    next();
  } catch (error: any) {
    console.error('Subscription middleware error:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
}

/**
 * Middleware to check ToS acceptance only (lighter check)
 */
export async function requireTosAcceptance(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await query(
      'SELECT tos_accepted_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tosAccepted = !!result.rows[0].tos_accepted_at;

    if (!tosAccepted) {
      return res.status(403).json({
        error: 'Terms of Service must be accepted',
        code: 'TOS_NOT_ACCEPTED',
      });
    }

    req.tosAccepted = tosAccepted;
    next();
  } catch (error: any) {
    console.error('ToS middleware error:', error);
    res.status(500).json({ error: 'Failed to verify ToS acceptance' });
  }
}
