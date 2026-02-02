/**
 * Server-side rate limiter using Supabase as storage
 * Implements sliding window counter algorithm
 */

interface RateLimitConfig {
  maxRequests: number;      // Max requests per window
  windowMs: number;         // Window duration in milliseconds
  keyPrefix: string;        // Prefix for the rate limit key (e.g., 'analyze-face')
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;          // Timestamp when rate limit resets
  retryAfter?: number;      // Seconds until retry is allowed (if rate limited)
}

interface RateLimitRecord {
  user_id: string;
  function_key: string;
  request_count: number;
  window_start: string;
  window_end: string;
}

// Use any for Supabase client to avoid type issues in Deno edge functions
type SupabaseClient = any;

/**
 * Check and record rate limit for a user
 * Uses a simple database table for persistent rate limiting
 */
export async function checkRateLimit(
  supabaseClient: SupabaseClient,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const functionKey = config.keyPrefix;
  const now = Date.now();
  const windowEnd = new Date(now + config.windowMs);

  try {
    // Try to get existing rate limit record
    const { data: existing, error: selectError } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('function_key', functionKey)
      .gte('window_end', new Date(now).toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      // For other errors, allow the request (fail open) but log for monitoring
      console.error('Rate limit check failed:', selectError.code);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    if (existing) {
      // Check if within the current window
      const record = existing as RateLimitRecord;
      const windowEndTs = new Date(record.window_end).getTime();
      
      if (record.request_count >= config.maxRequests) {
        // Rate limited
        const retryAfter = Math.ceil((windowEndTs - now) / 1000);
        return {
          allowed: false,
          remaining: 0,
          resetAt: windowEndTs,
          retryAfter: Math.max(1, retryAfter),
        };
      }

      // Increment the counter
      const { error: updateError } = await supabaseClient
        .from('rate_limits')
        .update({ request_count: record.request_count + 1 })
        .eq('user_id', userId)
        .eq('function_key', functionKey)
        .eq('window_start', record.window_start);

      if (updateError) {
        console.error('Rate limit update failed:', updateError.code);
      }

      return {
        allowed: true,
        remaining: config.maxRequests - record.request_count - 1,
        resetAt: windowEndTs,
      };
    }

    // No existing record, create a new one
    const { error: insertError } = await supabaseClient
      .from('rate_limits')
      .insert({
        user_id: userId,
        function_key: functionKey,
        request_count: 1,
        window_start: new Date(now).toISOString(),
        window_end: windowEnd.toISOString(),
      });

    if (insertError) {
      // If insert fails (e.g., race condition), try to update instead
      if (insertError.code === '23505') { // Unique violation
        // Another request created the record, retry check
        return checkRateLimit(supabaseClient, userId, config);
      }
      console.error('Rate limit insert failed:', insertError.code);
    }

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: windowEnd.getTime(),
    };

  } catch (error) {
    // On any unexpected error, fail open (allow request)
    console.error('Rate limiter error');
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Standard rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // analyze-face: 10 requests per hour (expensive AI call)
  'analyze-face': {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'analyze-face',
  },
  // suggest-dosage: 30 requests per hour (database query)
  'suggest-dosage': {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'suggest-dosage',
  },
} as const;
