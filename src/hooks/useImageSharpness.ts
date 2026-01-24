import { useCallback, useRef } from 'react';

export interface SharpnessResult {
  score: number;          // 0-100
  isSharp: boolean;       // score > threshold
  variance: number;       // Raw Laplacian variance
  edgeStrength: number;   // Sobel edge magnitude
  recommendation: string; // User-friendly feedback
}

interface UseImageSharpnessOptions {
  sharpnessThreshold?: number; // Minimum acceptable sharpness (default: 40)
  sampleRegion?: 'center' | 'full'; // Which region to analyze
}

export function useImageSharpness(options: UseImageSharpnessOptions = {}) {
  const { sharpnessThreshold = 40, sampleRegion = 'center' } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Calculate Laplacian variance (blur detection)
   * Higher variance = sharper image
   */
  const calculateLaplacianVariance = useCallback((
    gray: number[],
    width: number,
    height: number
  ): number => {
    const laplacian: number[] = [];
    let sum = 0;

    // Apply 3x3 Laplacian kernel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const lap = 
          -4 * gray[idx] +
          gray[idx - 1] +
          gray[idx + 1] +
          gray[idx - width] +
          gray[idx + width];
        laplacian.push(lap);
        sum += Math.abs(lap);
      }
    }

    const mean = sum / laplacian.length;
    let variance = 0;

    for (const lap of laplacian) {
      variance += Math.pow(Math.abs(lap) - mean, 2);
    }

    return variance / laplacian.length;
  }, []);

  /**
   * Calculate Sobel edge strength
   * Higher value = more defined edges
   */
  const calculateSobelEdgeStrength = useCallback((
    gray: number[],
    width: number,
    height: number
  ): number => {
    let totalMagnitude = 0;
    let count = 0;

    // Sobel kernels
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const pixel = gray[idx];
            gx += pixel * sobelX[ky + 1][kx + 1];
            gy += pixel * sobelY[ky + 1][kx + 1];
          }
        }

        totalMagnitude += Math.sqrt(gx * gx + gy * gy);
        count++;
      }
    }

    return totalMagnitude / count;
  }, []);

  /**
   * Analyze image/video frame for sharpness
   */
  const analyzeSharpness = useCallback((
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): SharpnessResult => {
    // Create or reuse canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return {
        score: 0,
        isSharp: false,
        variance: 0,
        edgeStrength: 0,
        recommendation: 'Erro ao analisar imagem',
      };
    }

    // Get source dimensions
    let sourceWidth: number;
    let sourceHeight: number;
    
    if (source instanceof HTMLVideoElement) {
      sourceWidth = source.videoWidth;
      sourceHeight = source.videoHeight;
    } else if (source instanceof HTMLImageElement) {
      sourceWidth = source.naturalWidth;
      sourceHeight = source.naturalHeight;
    } else {
      sourceWidth = source.width;
      sourceHeight = source.height;
    }

    if (sourceWidth === 0 || sourceHeight === 0) {
      return {
        score: 0,
        isSharp: false,
        variance: 0,
        edgeStrength: 0,
        recommendation: 'Imagem não carregada',
      };
    }

    // Determine analysis region
    let analysisX = 0;
    let analysisY = 0;
    let analysisWidth = sourceWidth;
    let analysisHeight = sourceHeight;

    if (sampleRegion === 'center') {
      // Analyze center 50% of image (where face typically is)
      analysisWidth = Math.floor(sourceWidth * 0.5);
      analysisHeight = Math.floor(sourceHeight * 0.5);
      analysisX = Math.floor((sourceWidth - analysisWidth) / 2);
      analysisY = Math.floor((sourceHeight - analysisHeight) / 2);
    }

    // Scale down for faster processing (max 200px)
    const maxSize = 200;
    const scale = Math.min(1, maxSize / Math.max(analysisWidth, analysisHeight));
    const scaledWidth = Math.floor(analysisWidth * scale);
    const scaledHeight = Math.floor(analysisHeight * scale);

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    // Draw and extract image data
    ctx.drawImage(
      source,
      analysisX, analysisY, analysisWidth, analysisHeight,
      0, 0, scaledWidth, scaledHeight
    );

    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
    const data = imageData.data;

    // Convert to grayscale
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Calculate metrics
    const variance = calculateLaplacianVariance(gray, scaledWidth, scaledHeight);
    const edgeStrength = calculateSobelEdgeStrength(gray, scaledWidth, scaledHeight);

    // Normalize variance to 0-100 score
    // Based on empirical testing:
    // variance < 100: very blurry
    // variance 100-300: slightly blurry
    // variance 300-600: acceptable
    // variance > 600: sharp
    const score = Math.min(100, Math.max(0, (variance / 600) * 100));
    const isSharp = score >= sharpnessThreshold;

    // Generate recommendation
    let recommendation: string;
    if (score >= 80) {
      recommendation = 'Imagem nítida ✓';
    } else if (score >= 60) {
      recommendation = 'Nitidez boa';
    } else if (score >= 40) {
      recommendation = 'Nitidez aceitável';
    } else if (score >= 20) {
      recommendation = 'Imagem levemente borrada — estabilize o dispositivo';
    } else {
      recommendation = 'Imagem muito borrada — mantenha o dispositivo firme';
    }

    return {
      score,
      isSharp,
      variance,
      edgeStrength,
      recommendation,
    };
  }, [sampleRegion, sharpnessThreshold, calculateLaplacianVariance, calculateSobelEdgeStrength]);

  /**
   * Analyze video frame continuously
   */
  const analyzeVideoFrame = useCallback((video: HTMLVideoElement): SharpnessResult => {
    if (video.readyState < 2) {
      return {
        score: 0,
        isSharp: false,
        variance: 0,
        edgeStrength: 0,
        recommendation: 'Aguardando vídeo...',
      };
    }
    return analyzeSharpness(video);
  }, [analyzeSharpness]);

  return {
    analyzeSharpness,
    analyzeVideoFrame,
    sharpnessThreshold,
  };
}
