import { useState, useCallback, useEffect, useRef } from 'react';

interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  storageKey?: string;
}

interface RateLimiterState {
  canProceed: boolean;
  remainingRequests: number;
  resetTime: number | null;
  secondsUntilReset: number;
}

interface UseRateLimiterReturn extends RateLimiterState {
  checkLimit: () => boolean;
  recordRequest: () => void;
  reset: () => void;
}

/**
 * Rate limiter hook for client-side request throttling
 * Persists state in localStorage to survive page refreshes
 */
export function useRateLimiter(config: RateLimiterConfig): UseRateLimiterReturn {
  const { maxRequests, windowMs, storageKey = 'rate_limiter' } = config;
  
  const [timestamps, setTimestamps] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out expired timestamps
        const now = Date.now();
        return parsed.filter((ts: number) => now - ts < windowMs);
      }
    } catch {
      // Ignore localStorage errors
    }
    return [];
  });

  const [secondsUntilReset, setSecondsUntilReset] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up expired timestamps and persist to localStorage
  useEffect(() => {
    const now = Date.now();
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (validTimestamps.length !== timestamps.length) {
      setTimestamps(validTimestamps);
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(validTimestamps));
    } catch {
      // Ignore localStorage errors
    }
  }, [timestamps, windowMs, storageKey]);

  // Calculate reset countdown
  useEffect(() => {
    const updateCountdown = () => {
      if (timestamps.length >= maxRequests) {
        const oldestTimestamp = Math.min(...timestamps);
        const resetTime = oldestTimestamp + windowMs;
        const remaining = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
        setSecondsUntilReset(remaining);
        
        if (remaining === 0) {
          // Clean up expired timestamp
          setTimestamps(prev => prev.filter(ts => Date.now() - ts < windowMs));
        }
      } else {
        setSecondsUntilReset(0);
      }
    };

    updateCountdown();
    
    if (timestamps.length >= maxRequests) {
      intervalRef.current = setInterval(updateCountdown, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timestamps, maxRequests, windowMs]);

  const remainingRequests = Math.max(0, maxRequests - timestamps.length);
  const canProceed = remainingRequests > 0;
  const resetTime = timestamps.length > 0 ? Math.min(...timestamps) + windowMs : null;

  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    return validTimestamps.length < maxRequests;
  }, [timestamps, maxRequests, windowMs]);

  const recordRequest = useCallback(() => {
    setTimestamps(prev => [...prev, Date.now()]);
  }, []);

  const reset = useCallback(() => {
    setTimestamps([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  return {
    canProceed,
    remainingRequests,
    resetTime,
    secondsUntilReset,
    checkLimit,
    recordRequest,
    reset,
  };
}

export default useRateLimiter;
