-- Create rate_limits table for server-side rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    function_key TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Unique constraint to prevent race conditions
    CONSTRAINT rate_limits_user_function_window_unique UNIQUE (user_id, function_key, window_start)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_function ON public.rate_limits(user_id, function_key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON public.rate_limits(window_end);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own rate limit records
CREATE POLICY "Users can view own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits" 
ON public.rate_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Service role can manage all (for cleanup jobs)
CREATE POLICY "Service role full access" 
ON public.rate_limits 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- Function to clean up expired rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.rate_limits 
    WHERE window_end < now() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO authenticated;