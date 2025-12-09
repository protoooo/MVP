// lib/usage.js

// Simple placeholder usage helper so your build succeeds.
// We can wire in real per-plan limits later.

export async function checkAndIncrementUsage(userId, { isImage = false } = {}) {
  // If somehow called without a user, treat it as "no subscription"
  if (!userId) {
    const err = new Error('Missing user for usage check');
    err.code = 'NO_SUBSCRIPTION';
    throw err;
  }

  // TODO: later we can:
  //  - look up the user's active Stripe plan (business vs enterprise)
  //  - check current period usage in a Supabase table
  //  - increment the appropriate counter (text or image)
  //
  // For now, just always allow and do nothing.
  return {
    ok: true,
    kind: isImage ? 'image' : 'text',
  };
}
