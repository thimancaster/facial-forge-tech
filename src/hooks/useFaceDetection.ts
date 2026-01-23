import { useEffect, useRef, useState, useCallback } from 'react';

export interface FaceLandmarks {
  // Key facial landmarks (normalized 0-1)
  noseTip: { x: number; y: number };
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  leftEyebrow: { x: number; y: number };
  rightEyebrow: { x: number; y: number };
  upperLip: { x: number; y: number };
  lowerLip: { x: number; y: number };
  leftCheek: { x: number; y: number };
  rightCheek: { x: number; y: number };
  chin: { x: number; y: number };
  forehead: { x: number; y: number };
  // Face bounding box
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Face angle estimation
  tiltAngle: number; // degrees, 0 = straight
  turnAngle: number; // degrees, 0 = facing camera
}

export interface FaceDetectionResult {
  detected: boolean;
  landmarks: FaceLandmarks | null;
  quality: FaceQuality;
}

export interface FaceQuality {
  isCentered: boolean;
  isCorrectDistance: boolean;
  isLevel: boolean;
  isFacingCamera: boolean;
  isWellLit: boolean;
  overallScore: number; // 0-100
  issues: string[];
}

interface UseFaceDetectionOptions {
  onResult?: (result: FaceDetectionResult) => void;
  detectionInterval?: number; // ms between detections
}

// Simplified face detection using canvas analysis
// This provides basic positioning feedback without heavy ML libraries
export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseFaceDetectionOptions = {}
) {
  const { onResult, detectionInterval = 200 } = options;
  const [result, setResult] = useState<FaceDetectionResult>({
    detected: false,
    landmarks: null,
    quality: {
      isCentered: false,
      isCorrectDistance: false,
      isLevel: true,
      isFacingCamera: true,
      isWellLit: true,
      overallScore: 0,
      issues: ['Aguardando detecção...'],
    },
  });
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);

  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const now = Date.now();
    if (now - lastDetectionRef.current < detectionInterval) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }
    lastDetectionRef.current = now;

    // Create canvas for analysis
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    // Resize canvas to match video
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    canvas.width = width;
    canvas.height = height;

    // Draw video frame
    ctx.drawImage(video, 0, 0, width, height);

    // Analyze the frame for face-like regions using skin tone detection
    const faceData = detectFaceRegion(ctx, width, height);
    
    const quality = evaluateQuality(faceData, width, height);
    
    const newResult: FaceDetectionResult = {
      detected: faceData.detected,
      landmarks: faceData.detected ? faceData.landmarks : null,
      quality,
    };

    setResult(newResult);
    onResult?.(newResult);

    animationRef.current = requestAnimationFrame(analyzeFrame);
  }, [videoRef, detectionInterval, onResult]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyzeFrame]);

  return result;
}

interface FaceRegionData {
  detected: boolean;
  landmarks: FaceLandmarks;
  skinPixelRatio: number;
  brightness: number;
}

function detectFaceRegion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): FaceRegionData {
  // Sample the center region where face should be
  const sampleSize = 100;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const startX = Math.max(0, centerX - sampleSize);
  const startY = Math.max(0, centerY - sampleSize);
  
  const imageData = ctx.getImageData(
    startX,
    startY,
    Math.min(sampleSize * 2, width - startX),
    Math.min(sampleSize * 2, height - startY)
  );
  
  const data = imageData.data;
  let skinPixels = 0;
  let totalBrightness = 0;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  const pixelCount = data.length / 4;

  // Detect skin tones and face region
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    totalBrightness += (r + g + b) / 3;
    
    // Simple skin tone detection (works for various skin tones)
    if (isSkinTone(r, g, b)) {
      skinPixels++;
      const pixelIndex = i / 4;
      const localX = pixelIndex % imageData.width;
      const localY = Math.floor(pixelIndex / imageData.width);
      const globalX = startX + localX;
      const globalY = startY + localY;
      
      if (globalX < minX) minX = globalX;
      if (globalX > maxX) maxX = globalX;
      if (globalY < minY) minY = globalY;
      if (globalY > maxY) maxY = globalY;
    }
  }

  const skinRatio = skinPixels / pixelCount;
  const avgBrightness = totalBrightness / pixelCount;
  const detected = skinRatio > 0.15; // At least 15% skin pixels in center

  // Estimate face bounds
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const faceCenterX = (minX + maxX) / 2;
  const faceCenterY = (minY + maxY) / 2;

  // Create estimated landmarks based on face region
  const landmarks: FaceLandmarks = {
    noseTip: { x: faceCenterX / width, y: (faceCenterY + faceHeight * 0.1) / height },
    leftEye: { x: (faceCenterX - faceWidth * 0.15) / width, y: (faceCenterY - faceHeight * 0.15) / height },
    rightEye: { x: (faceCenterX + faceWidth * 0.15) / width, y: (faceCenterY - faceHeight * 0.15) / height },
    leftEyebrow: { x: (faceCenterX - faceWidth * 0.15) / width, y: (faceCenterY - faceHeight * 0.25) / height },
    rightEyebrow: { x: (faceCenterX + faceWidth * 0.15) / width, y: (faceCenterY - faceHeight * 0.25) / height },
    upperLip: { x: faceCenterX / width, y: (faceCenterY + faceHeight * 0.25) / height },
    lowerLip: { x: faceCenterX / width, y: (faceCenterY + faceHeight * 0.35) / height },
    leftCheek: { x: (faceCenterX - faceWidth * 0.25) / width, y: faceCenterY / height },
    rightCheek: { x: (faceCenterX + faceWidth * 0.25) / width, y: faceCenterY / height },
    chin: { x: faceCenterX / width, y: (faceCenterY + faceHeight * 0.45) / height },
    forehead: { x: faceCenterX / width, y: (faceCenterY - faceHeight * 0.35) / height },
    boundingBox: {
      x: minX / width,
      y: minY / height,
      width: faceWidth / width,
      height: faceHeight / height,
    },
    tiltAngle: 0,
    turnAngle: 0,
  };

  return {
    detected,
    landmarks,
    skinPixelRatio: skinRatio,
    brightness: avgBrightness,
  };
}

function isSkinTone(r: number, g: number, b: number): boolean {
  // YCbCr skin detection (works well for diverse skin tones)
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Skin tone ranges in YCbCr
  return (
    y > 80 &&
    cb > 77 && cb < 127 &&
    cr > 133 && cr < 173
  );
}

function evaluateQuality(faceData: FaceRegionData, width: number, height: number): FaceQuality {
  const issues: string[] = [];
  let score = 0;

  if (!faceData.detected) {
    return {
      isCentered: false,
      isCorrectDistance: false,
      isLevel: false,
      isFacingCamera: false,
      isWellLit: false,
      overallScore: 0,
      issues: ['Posicione o rosto no centro da tela'],
    };
  }

  const { boundingBox } = faceData.landmarks;
  
  // Check centering (face center should be within 20% of image center)
  const faceCenterX = boundingBox.x + boundingBox.width / 2;
  const faceCenterY = boundingBox.y + boundingBox.height / 2;
  const centerOffsetX = Math.abs(faceCenterX - 0.5);
  const centerOffsetY = Math.abs(faceCenterY - 0.5);
  const isCentered = centerOffsetX < 0.15 && centerOffsetY < 0.15;
  
  if (!isCentered) {
    if (centerOffsetX >= 0.15) {
      issues.push(faceCenterX < 0.5 ? 'Mova para a direita' : 'Mova para a esquerda');
    }
    if (centerOffsetY >= 0.15) {
      issues.push(faceCenterY < 0.5 ? 'Mova para baixo' : 'Mova para cima');
    }
  } else {
    score += 25;
  }

  // Check distance (face should occupy 30-60% of frame height)
  const faceHeightRatio = boundingBox.height;
  const isCorrectDistance = faceHeightRatio > 0.35 && faceHeightRatio < 0.75;
  
  if (!isCorrectDistance) {
    if (faceHeightRatio <= 0.35) {
      issues.push('Aproxime-se da câmera');
    } else {
      issues.push('Afaste-se da câmera');
    }
  } else {
    score += 25;
  }

  // Check lighting
  const isWellLit = faceData.brightness > 60 && faceData.brightness < 220;
  if (!isWellLit) {
    if (faceData.brightness <= 60) {
      issues.push('Melhore a iluminação');
    } else {
      issues.push('Reduza a luz (muito clara)');
    }
  } else {
    score += 25;
  }

  // Level and facing camera (approximated by skin detection symmetry)
  const isLevel = true; // Would need more sophisticated detection
  const isFacingCamera = faceData.skinPixelRatio > 0.2;
  
  if (!isFacingCamera) {
    issues.push('Olhe diretamente para a câmera');
  } else {
    score += 25;
  }

  if (issues.length === 0) {
    issues.push('Posição ideal! ✓');
  }

  return {
    isCentered,
    isCorrectDistance,
    isLevel,
    isFacingCamera,
    isWellLit,
    overallScore: score,
    issues,
  };
}
