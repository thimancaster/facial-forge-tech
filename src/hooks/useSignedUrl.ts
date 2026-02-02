import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid re-signing the same path
const urlCache = new Map<string, { signedUrl: string; expiresAt: number }>();

// Default expiration: 1 hour (in seconds)
const DEFAULT_EXPIRY_SECONDS = 60 * 60;
// Cache buffer: refresh 5 minutes before expiry
const CACHE_BUFFER_MS = 5 * 60 * 1000;

/**
 * Extract the storage path from a signed URL or full storage URL
 * Returns the path relative to the bucket (e.g., "userId/patientId/photo.jpg")
 */
export function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Pattern: /storage/v1/object/sign/bucket-name/path or /storage/v1/object/public/bucket-name/path
    const signedMatch = pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/patient-photos\/(.+)/);
    if (signedMatch) {
      return decodeURIComponent(signedMatch[1]);
    }
    
    // Already just a path (no URL structure)
    if (!url.startsWith('http')) {
      return url;
    }
    
    return null;
  } catch {
    // If not a valid URL, treat as path
    if (!url.startsWith('http')) {
      return url;
    }
    return null;
  }
}

/**
 * Check if a signed URL is expired or about to expire
 */
function isExpiredOrExpiring(expiresAt: number): boolean {
  return Date.now() >= expiresAt - CACHE_BUFFER_MS;
}

/**
 * Generate a signed URL for a storage path
 */
export async function generateSignedUrl(
  path: string,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS
): Promise<string | null> {
  // Check cache first
  const cached = urlCache.get(path);
  if (cached && !isExpiredOrExpiring(cached.expiresAt)) {
    return cached.signedUrl;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('patient-photos')
      .createSignedUrl(path, expirySeconds);
    
    if (error || !data?.signedUrl) {
      if (import.meta.env.DEV) {
        console.error('[DEV] Failed to create signed URL:', error?.message);
      }
      return null;
    }
    
    // Cache the result
    urlCache.set(path, {
      signedUrl: data.signedUrl,
      expiresAt: Date.now() + (expirySeconds * 1000),
    });
    
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Hook to get a signed URL for a single photo
 * Automatically refreshes when URL is about to expire
 */
export function useSignedUrl(
  storedUrl: string | null | undefined,
  options?: { expirySeconds?: number }
): { signedUrl: string | null; isLoading: boolean; error: string | null } {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const expirySeconds = options?.expirySeconds ?? DEFAULT_EXPIRY_SECONDS;
  
  useEffect(() => {
    if (!storedUrl) {
      setSignedUrl(null);
      setIsLoading(false);
      return;
    }
    
    const path = extractStoragePath(storedUrl);
    if (!path) {
      // If we can't extract path, try using the URL directly (might already be valid)
      setSignedUrl(storedUrl);
      setIsLoading(false);
      return;
    }
    
    let cancelled = false;
    
    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      
      const url = await generateSignedUrl(path, expirySeconds);
      
      if (cancelled) return;
      
      if (url) {
        setSignedUrl(url);
      } else {
        // Fallback to stored URL if signing fails
        setSignedUrl(storedUrl);
        setError('Failed to generate signed URL');
      }
      setIsLoading(false);
    };
    
    fetchSignedUrl();
    
    // Set up refresh timer (refresh 5 min before expiry)
    const refreshInterval = setInterval(() => {
      fetchSignedUrl();
    }, (expirySeconds * 1000) - CACHE_BUFFER_MS);
    
    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [storedUrl, expirySeconds]);
  
  return { signedUrl, isLoading, error };
}

/**
 * Hook to get signed URLs for multiple photos
 * Returns a map of original URL -> signed URL
 */
export function useSignedUrls(
  storedUrls: (string | null | undefined)[],
  options?: { expirySeconds?: number }
): { signedUrls: Map<string, string>; isLoading: boolean } {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  
  const expirySeconds = options?.expirySeconds ?? DEFAULT_EXPIRY_SECONDS;
  
  // Filter out nulls and get unique URLs
  const validUrls = storedUrls.filter((url): url is string => !!url);
  const urlsKey = validUrls.sort().join('|');
  
  useEffect(() => {
    if (validUrls.length === 0) {
      setSignedUrls(new Map());
      setIsLoading(false);
      return;
    }
    
    let cancelled = false;
    
    const fetchAllSignedUrls = async () => {
      setIsLoading(true);
      
      const results = await Promise.all(
        validUrls.map(async (storedUrl) => {
          const path = extractStoragePath(storedUrl);
          if (!path) {
            return { original: storedUrl, signed: storedUrl };
          }
          
          const signedUrl = await generateSignedUrl(path, expirySeconds);
          return { original: storedUrl, signed: signedUrl || storedUrl };
        })
      );
      
      if (cancelled) return;
      
      const newMap = new Map<string, string>();
      results.forEach(({ original, signed }) => {
        newMap.set(original, signed);
      });
      
      setSignedUrls(newMap);
      setIsLoading(false);
    };
    
    fetchAllSignedUrls();
    
    // Set up refresh timer
    const refreshInterval = setInterval(() => {
      fetchAllSignedUrls();
    }, (expirySeconds * 1000) - CACHE_BUFFER_MS);
    
    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [urlsKey, expirySeconds]);
  
  return { signedUrls, isLoading };
}

/**
 * Clear the URL cache (useful for logout or cleanup)
 */
export function clearSignedUrlCache(): void {
  urlCache.clear();
}
