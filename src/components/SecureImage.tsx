import { useState } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecureImageProps {
  /** The stored URL (may be signed or path) from the database */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Fallback content when image fails to load */
  fallback?: React.ReactNode;
  /** Show loading skeleton while generating signed URL */
  showLoadingState?: boolean;
  /** onClick handler for the image */
  onClick?: () => void;
  /** Object-fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
}

/**
 * SecureImage component that automatically handles signed URLs for private storage
 * Use this instead of <img> for any patient photos from the private bucket
 */
export function SecureImage({
  src,
  alt,
  className,
  fallback,
  showLoadingState = true,
  onClick,
  objectFit = 'cover',
}: SecureImageProps) {
  const { signedUrl, isLoading: isSigningUrl } = useSignedUrl(src);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // No source provided
  if (!src) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <ImageOff className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  // Loading state while signing URL
  if (isSigningUrl && showLoadingState) {
    return <Skeleton className={cn('rounded-lg', className)} />;
  }

  // Image failed to load
  if (imageError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <ImageOff className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {!imageLoaded && showLoadingState && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
      <img
        src={signedUrl || src}
        alt={alt}
        className={cn(
          'w-full h-full transition-opacity duration-200',
          !imageLoaded && 'opacity-0',
          imageLoaded && 'opacity-100',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none'
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : undefined }}
      />
    </div>
  );
}

export default SecureImage;
