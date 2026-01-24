import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * MediaPipe Face Mesh landmarks (468 points)
 * Key landmark indices for facial analysis
 */
export const FACE_MESH_LANDMARKS = {
  // Nose
  noseTip: 1,
  noseTop: 6,
  
  // Eyes
  leftEyeInner: 133,
  leftEyeOuter: 33,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  
  // Eyebrows
  leftEyebrowInner: 107,
  leftEyebrowMiddle: 105,
  leftEyebrowOuter: 70,
  rightEyebrowInner: 336,
  rightEyebrowMiddle: 334,
  rightEyebrowOuter: 300,
  
  // Lips
  upperLipTop: 13,
  lowerLipBottom: 14,
  leftLipCorner: 61,
  rightLipCorner: 291,
  
  // Face contour
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  forehead: 10,
  
  // Glabella region
  glabella: 9,
  
  // Mediopupilar landmarks
  leftPupil: 468, // Virtual - calculated from eye landmarks
  rightPupil: 473, // Virtual - calculated from eye landmarks
} as const;

export interface MediaPipeLandmark {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  z: number; // Depth (negative = towards camera)
}

export interface FaceMeshResult {
  landmarks: MediaPipeLandmark[];
  faceOval: MediaPipeLandmark[];
  leftEye: MediaPipeLandmark[];
  rightEye: MediaPipeLandmark[];
  leftEyebrow: MediaPipeLandmark[];
  rightEyebrow: MediaPipeLandmark[];
  lips: MediaPipeLandmark[];
}

export interface EnhancedFaceQuality {
  // Position checks
  isCentered: boolean;
  isCorrectDistance: boolean;
  isLevel: boolean;
  isFacingCamera: boolean;
  isWellLit: boolean;
  
  // New enhanced checks
  isSharp: boolean;
  isSymmetric: boolean;
  hasCorrectExpression: boolean;
  
  // Detailed metrics
  faceCenterOffset: { x: number; y: number };
  faceRotation: { pitch: number; yaw: number; roll: number };
  faceSizeRatio: number;
  symmetryScore: number;
  sharpnessScore: number;
  brightnessLevel: number;
  
  // Overall
  overallScore: number;
  issues: string[];
}

interface UseMediaPipeFaceMeshOptions {
  onResult?: (result: FaceMeshResult | null, quality: EnhancedFaceQuality) => void;
  detectionInterval?: number;
  enableSharpnessCheck?: boolean;
}

// Check if MediaPipe is available
const isMediaPipeAvailable = () => {
  return typeof window !== 'undefined' && 'FaceLandmarker' in (window as any);
};

export function useMediaPipeFaceMesh(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseMediaPipeFaceMeshOptions = {}
) {
  const { onResult, detectionInterval = 100, enableSharpnessCheck = true } = options;
  
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState<FaceMeshResult | null>(null);
  const [quality, setQuality] = useState<EnhancedFaceQuality>({
    isCentered: false,
    isCorrectDistance: false,
    isLevel: false,
    isFacingCamera: false,
    isWellLit: true,
    isSharp: true,
    isSymmetric: true,
    hasCorrectExpression: true,
    faceCenterOffset: { x: 0, y: 0 },
    faceRotation: { pitch: 0, yaw: 0, roll: 0 },
    faceSizeRatio: 0,
    symmetryScore: 100,
    sharpnessScore: 100,
    brightnessLevel: 50,
    overallScore: 0,
    issues: ['Inicializando detecção...'],
  });
  
  const faceLandmarkerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        // Dynamic import of MediaPipe vision tasks
        const vision = await import('@mediapipe/tasks-vision');
        const { FaceLandmarker, FilesetResolver } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (isMounted) {
          faceLandmarkerRef.current = faceLandmarker;
          setIsReady(true);
        }
      } catch (error) {
        console.warn('MediaPipe initialization failed, using fallback:', error);
        if (isMounted) {
          setIsReady(false);
        }
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, []);

  // Sharpness detection using Laplacian variance
  const calculateSharpness = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number): number => {
    if (!enableSharpnessCheck) return 100;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Convert to grayscale and calculate Laplacian variance
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Apply Laplacian kernel
    let variance = 0;
    let mean = 0;
    const laplacian: number[] = [];

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
        mean += Math.abs(lap);
      }
    }

    mean /= laplacian.length;

    for (const lap of laplacian) {
      variance += Math.pow(Math.abs(lap) - mean, 2);
    }
    variance /= laplacian.length;

    // Normalize to 0-100 scale (higher variance = sharper)
    // Typical sharp image has variance > 500
    return Math.min(100, (variance / 500) * 100);
  }, [enableSharpnessCheck]);

  // Calculate brightness
  const calculateBrightness = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number): number => {
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const sampleSize = Math.min(100, Math.floor(width / 4));
    
    const imageData = ctx.getImageData(
      centerX - sampleSize,
      centerY - sampleSize,
      sampleSize * 2,
      sampleSize * 2
    );
    
    let totalBrightness = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      totalBrightness += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    }
    
    return totalBrightness / (imageData.data.length / 4);
  }, []);

  // Process frame with MediaPipe
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !faceLandmarkerRef.current) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = Date.now();
    if (now - lastDetectionRef.current < detectionInterval) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastDetectionRef.current = now;

    try {
      // Detect face landmarks
      const detections = faceLandmarkerRef.current.detectForVideo(video, now);
      
      if (!detections.faceLandmarks || detections.faceLandmarks.length === 0) {
        const noFaceQuality: EnhancedFaceQuality = {
          isCentered: false,
          isCorrectDistance: false,
          isLevel: false,
          isFacingCamera: false,
          isWellLit: true,
          isSharp: true,
          isSymmetric: true,
          hasCorrectExpression: true,
          faceCenterOffset: { x: 0, y: 0 },
          faceRotation: { pitch: 0, yaw: 0, roll: 0 },
          faceSizeRatio: 0,
          symmetryScore: 0,
          sharpnessScore: 0,
          brightnessLevel: 0,
          overallScore: 0,
          issues: ['Posicione o rosto no centro da tela'],
        };
        setResult(null);
        setQuality(noFaceQuality);
        onResult?.(null, noFaceQuality);
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const landmarks = detections.faceLandmarks[0] as MediaPipeLandmark[];

      // Extract specific facial regions
      const faceMeshResult: FaceMeshResult = {
        landmarks,
        faceOval: extractFaceOval(landmarks),
        leftEye: extractLeftEye(landmarks),
        rightEye: extractRightEye(landmarks),
        leftEyebrow: extractLeftEyebrow(landmarks),
        rightEyebrow: extractRightEyebrow(landmarks),
        lips: extractLips(landmarks),
      };

      // Create canvas for additional analysis
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      let sharpnessScore = 100;
      let brightnessLevel = 128;
      
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        sharpnessScore = calculateSharpness(ctx, canvas.width, canvas.height);
        brightnessLevel = calculateBrightness(ctx, canvas.width, canvas.height);
      }

      // Calculate quality metrics
      const newQuality = evaluateEnhancedQuality(landmarks, sharpnessScore, brightnessLevel);
      
      setResult(faceMeshResult);
      setQuality(newQuality);
      onResult?.(faceMeshResult, newQuality);

    } catch (error) {
      console.warn('Face detection error:', error);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, detectionInterval, onResult, calculateSharpness, calculateBrightness]);

  // Start processing when ready
  useEffect(() => {
    if (isReady && videoRef.current) {
      animationRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isReady, processFrame]);

  return {
    isReady,
    result,
    quality,
    landmarks: result?.landmarks || null,
  };
}

// Helper functions to extract facial regions from 468 landmarks
function extractFaceOval(landmarks: MediaPipeLandmark[]): MediaPipeLandmark[] {
  const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  return faceOvalIndices.map(i => landmarks[i]).filter(Boolean);
}

function extractLeftEye(landmarks: MediaPipeLandmark[]): MediaPipeLandmark[] {
  const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
  return leftEyeIndices.map(i => landmarks[i]).filter(Boolean);
}

function extractRightEye(landmarks: MediaPipeLandmark[]): MediaPipeLandmark[] {
  const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
  return rightEyeIndices.map(i => landmarks[i]).filter(Boolean);
}

function extractLeftEyebrow(landmarks: MediaPipeLandmark[]): MediaPipeLandmark[] {
  const leftEyebrowIndices = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
  return leftEyebrowIndices.map(i => landmarks[i]).filter(Boolean);
}

function extractRightEyebrow(landmarks: MediaPipeLandmark[]): MediaPipeLandmark[] {
  const rightEyebrowIndices = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
  return rightEyebrowIndices.map(i => landmarks[i]).filter(Boolean);
}

function extractLips(landmarks: MediaPipeLandmark[]): MediaPipeLandmark[] {
  const lipsIndices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 185, 40, 39, 37, 0, 267, 269, 270, 409];
  return lipsIndices.map(i => landmarks[i]).filter(Boolean);
}

function evaluateEnhancedQuality(
  landmarks: MediaPipeLandmark[],
  sharpnessScore: number,
  brightnessLevel: number
): EnhancedFaceQuality {
  const issues: string[] = [];
  let score = 0;

  // Get key landmarks for calculations
  const noseTip = landmarks[FACE_MESH_LANDMARKS.noseTip];
  const leftEyeOuter = landmarks[FACE_MESH_LANDMARKS.leftEyeOuter];
  const rightEyeOuter = landmarks[FACE_MESH_LANDMARKS.rightEyeOuter];
  const chin = landmarks[FACE_MESH_LANDMARKS.chin];
  const forehead = landmarks[FACE_MESH_LANDMARKS.forehead];

  // Calculate face center
  const faceCenter = {
    x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
    y: (forehead.y + chin.y) / 2,
  };

  // Check centering (should be within 15% of center)
  const centerOffsetX = Math.abs(faceCenter.x - 0.5);
  const centerOffsetY = Math.abs(faceCenter.y - 0.5);
  const isCentered = centerOffsetX < 0.15 && centerOffsetY < 0.15;
  
  if (!isCentered) {
    if (centerOffsetX >= 0.15) {
      issues.push(faceCenter.x < 0.5 ? 'Mova para a direita' : 'Mova para a esquerda');
    }
    if (centerOffsetY >= 0.15) {
      issues.push(faceCenter.y < 0.5 ? 'Mova para baixo' : 'Mova para cima');
    }
  } else {
    score += 15;
  }

  // Check face size (should occupy 40-70% of frame height)
  const faceHeight = chin.y - forehead.y;
  const isCorrectDistance = faceHeight > 0.35 && faceHeight < 0.75;
  
  if (!isCorrectDistance) {
    issues.push(faceHeight <= 0.35 ? 'Aproxime-se da câmera' : 'Afaste-se da câmera');
  } else {
    score += 15;
  }

  // Calculate face rotation using eye positions and nose
  const eyesDeltaX = rightEyeOuter.x - leftEyeOuter.x;
  const eyesDeltaY = rightEyeOuter.y - leftEyeOuter.y;
  const roll = Math.atan2(eyesDeltaY, eyesDeltaX) * (180 / Math.PI);
  
  // Yaw estimation from nose position relative to eye center
  const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const yaw = (noseTip.x - eyeCenterX) * 100; // Simplified yaw estimation
  
  // Pitch estimation from nose position relative to eye-chin midpoint
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const pitch = (noseTip.y - eyeCenterY) * 100;

  const isLevel = Math.abs(roll) < 10;
  const isFacingCamera = Math.abs(yaw) < 15 && Math.abs(pitch) < 20;

  if (!isLevel) {
    issues.push(roll > 0 ? 'Incline a cabeça para a esquerda' : 'Incline a cabeça para a direita');
  } else {
    score += 15;
  }

  if (!isFacingCamera) {
    if (Math.abs(yaw) >= 15) {
      issues.push(yaw > 0 ? 'Olhe mais para a esquerda' : 'Olhe mais para a direita');
    } else {
      issues.push(pitch > 0 ? 'Levante o queixo' : 'Abaixe o queixo');
    }
  } else {
    score += 15;
  }

  // Check lighting
  const isWellLit = brightnessLevel > 60 && brightnessLevel < 220;
  if (!isWellLit) {
    issues.push(brightnessLevel <= 60 ? 'Melhore a iluminação' : 'Reduza a luz (muito clara)');
  } else {
    score += 15;
  }

  // Check sharpness
  const isSharp = sharpnessScore > 40;
  if (!isSharp) {
    issues.push('Imagem borrada — mantenha o dispositivo firme');
  } else {
    score += 15;
  }

  // Check symmetry
  const leftEyeSize = Math.hypot(
    landmarks[FACE_MESH_LANDMARKS.leftEyeOuter].x - landmarks[FACE_MESH_LANDMARKS.leftEyeInner].x,
    landmarks[FACE_MESH_LANDMARKS.leftEyeOuter].y - landmarks[FACE_MESH_LANDMARKS.leftEyeInner].y
  );
  const rightEyeSize = Math.hypot(
    landmarks[FACE_MESH_LANDMARKS.rightEyeOuter].x - landmarks[FACE_MESH_LANDMARKS.rightEyeInner].x,
    landmarks[FACE_MESH_LANDMARKS.rightEyeOuter].y - landmarks[FACE_MESH_LANDMARKS.rightEyeInner].y
  );
  const symmetryScore = 100 - Math.abs(leftEyeSize - rightEyeSize) * 500;
  const isSymmetric = symmetryScore > 80;
  
  if (!isSymmetric && Math.abs(yaw) < 10) {
    score += 5; // Partial credit
  } else {
    score += 10;
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
    isSharp,
    isSymmetric,
    hasCorrectExpression: true,
    faceCenterOffset: { x: centerOffsetX, y: centerOffsetY },
    faceRotation: { pitch, yaw, roll },
    faceSizeRatio: faceHeight,
    symmetryScore,
    sharpnessScore,
    brightnessLevel,
    overallScore: Math.min(100, score),
    issues,
  };
}
