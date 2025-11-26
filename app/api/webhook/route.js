import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ✅ FIX: Validate environment variables on startup
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is missing');
  throw new Error('STRIPE_SECRET_KEY must be configured');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('❌ STRIPE_WEBHOOK_SECRET is missing');
  throw new Error('STRIPE_WEBHOOK_SECRET must be configured');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  // Validate webhook secret exists
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Webhook secret not configured');
    return NextResponse.json({ 
      error: 'Webhook configuration error' 
    }, { status: 500 });
  }

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

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        // ✅ ADDED: Validate subscription exists
        if (!subscription) {
          console.error('❌ Could not retrieve subscription from Stripe');
          break;
        }

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

        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: true,
            requests_used: 0,
            images_used: 0, // ✅ ADDED: Reset image count on new subscription
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
        
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (sub?.user_id) {
          console.log(`📧 Should send trial ending email to user ${sub.user_id}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        console.log(`📝 Subscription ${subscription.id} updated to status: ${subscription.status}`);

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!existingSub?.user_id) {
          console.error('❌ Could not find user for subscription:', subscription.id);
          break;
        }

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

        if (subscription.status === 'active') {
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

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (sub?.user_id) {
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.user_id);

          console.log(`❌ User ${sub.user_id} access revoked (subscription deleted)`);
        }

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

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (sub?.user_id) {
            await supabase
              .from('user_profiles')
              .update({ 
                requests_used: 0,
                images_used: 0, // ✅ ADDED: Reset image counter on payment
                is_subscribed: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.user_id);

            console.log(`🔄 Reset request & image counters for user ${sub.user_id}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          console.log(`❌ Payment failed for subscription ${subscriptionId}`);

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (sub?.user_id) {
            await supabase
              .from('subscriptions')
              .update({ 
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', subscriptionId);

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
