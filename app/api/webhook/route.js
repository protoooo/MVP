import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  console.log('✅ Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId) {
          console.error('❌ Missing userId in session metadata');
          break;
        }

        console.log(`💳 Checkout completed for user ${userId}, plan: ${plan || 'unknown'}`);

        // If subscription is in trial, mark as subscribed immediately
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const isTrialing = subscription.status === 'trialing';

        // Create or update subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: subscription.status,
            plan: plan || 'pro',
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (subError) {
          console.error('❌ Failed to create subscription:', subError);
        }

        // Update user profile - grant access during trial
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: true, // ✅ Grant access immediately (includes trial)
            requests_used: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileError) {
          console.error('❌ Failed to update user profile:', profileError);
        } else {
          console.log(`✅ User ${userId} granted access (Status: ${subscription.status})`);
        }

        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        console.log(`⏰ Trial ending soon for subscription ${subscription.id}`);
        
        // Optional: Send email reminder to user
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (sub?.user_id) {
          console.log(`📧 Should send trial ending email to user ${sub.user_id}`);
          // Implement email notification here
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        console.log(`📝 Subscription ${subscription.id} updated to status: ${subscription.status}`);

        // Get the user associated with this subscription
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!existingSub?.user_id) {
          console.error('❌ Could not find user for subscription:', subscription.id);
          break;
        }

        // Update subscription status
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ 
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subError) {
          console.error('❌ Failed to update subscription:', subError);
        }

        // Handle different subscription statuses
        if (subscription.status === 'active') {
          // Subscription is now active (trial ended, payment succeeded)
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.user_id);
          
          console.log(`✅ User ${existingSub.user_id} subscription activated`);
        } 
        else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          // Payment failed, disable access
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.user_id);
          
          console.log(`⚠️ User ${existingSub.user_id} access revoked (status: ${subscription.status})`);
        }
        else if (subscription.status === 'canceled') {
          // Subscription canceled
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.user_id);
          
          console.log(`❌ User ${existingSub.user_id} subscription canceled`);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        console.log(`🗑️ Subscription ${subscription.id} deleted`);

        // Get user ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (sub?.user_id) {
          // Revoke access
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.user_id);

          console.log(`❌ User ${sub.user_id} access revoked (subscription deleted)`);
        }

        // Mark subscription as canceled
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          console.log(`✅ Payment succeeded for subscription ${subscriptionId}`);

          // Get user from subscription
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (sub?.user_id) {
            // Reset monthly request counter on successful payment
            await supabase
              .from('user_profiles')
              .update({ 
                requests_used: 0,
                is_subscribed: true, // Ensure access is granted
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.user_id);

            console.log(`🔄 Reset request counter for user ${sub.user_id}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          console.log(`❌ Payment failed for subscription ${subscriptionId}`);

          // Get user from subscription
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (sub?.user_id) {
            // Mark subscription as past_due
            await supabase
              .from('subscriptions')
              .update({ 
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', subscriptionId);

            // Optionally revoke access immediately or wait for retry
            // For now, we'll wait for the subscription.updated event
            console.log(`⚠️ Payment failed for user ${sub.user_id} - awaiting retry`);
          }
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('❌ Error processing webhook:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
