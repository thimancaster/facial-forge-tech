import { useMemo } from 'react';
import { MediaPipeLandmark, FACE_MESH_LANDMARKS } from './useMediaPipeFaceMesh';
import { PhotoType } from '@/components/CameraCapture';

/**
 * Expression types that can be detected
 */
export type ExpressionType = 
  | 'neutral'      // Resting face
  | 'frown'        // Glabelar contraction (angry)
  | 'surprise'     // Raised eyebrows (frontal)
  | 'smile'        // Wide smile for crow's feet
  | 'bunny_lines'  // Nasal contraction
  | 'pucker'       // Lip pucker for perioral
  | 'unknown';

/**
 * Expression detection result
 */
export interface ExpressionResult {
  detectedExpression: ExpressionType;
  expectedExpression: ExpressionType;
  isCorrectExpression: boolean;
  confidence: number;
  metrics: ExpressionMetrics;
  feedback: string;
}

/**
 * Detailed expression metrics
 */
export interface ExpressionMetrics {
  // Eye metrics
  eyeOpenness: number;           // 0-1 (0 = closed, 1 = wide open)
  leftEyeOpenness: number;
  rightEyeOpenness: number;
  
  // Eyebrow metrics
  eyebrowHeight: number;         // Relative to neutral
  eyebrowFurrowed: number;       // 0-1 (0 = relaxed, 1 = fully furrowed)
  
  // Mouth metrics
  mouthOpenness: number;         // 0-1
  smileWidth: number;            // Normalized smile width
  lipPucker: number;             // 0-1 (0 = relaxed, 1 = full pucker)
  
  // Nose metrics
  nasalContraction: number;      // 0-1 (bunny lines intensity)
}

/**
 * Expected expression for each photo type
 */
const PHOTO_EXPRESSIONS: Record<PhotoType, ExpressionType> = {
  resting: 'neutral',
  glabellar: 'frown',
  frontal: 'surprise',
  smile: 'smile',
  nasal: 'bunny_lines',
  perioral: 'pucker',
  profile_left: 'neutral',
  profile_right: 'neutral',
};

/**
 * Expression feedback messages
 */
const EXPRESSION_FEEDBACK: Record<ExpressionType, { correct: string; instruction: string }> = {
  neutral: {
    correct: 'Expressão neutra detectada ✓',
    instruction: 'Relaxe todos os músculos faciais',
  },
  frown: {
    correct: 'Contração glabelar detectada ✓',
    instruction: 'Franza a testa — faça expressão de "bravo"',
  },
  surprise: {
    correct: 'Sobrancelhas elevadas ✓',
    instruction: 'Levante as sobrancelhas bem alto — "surpresa"',
  },
  smile: {
    correct: 'Sorriso intenso detectado ✓',
    instruction: 'Sorria mostrando os dentes — ative pés de galinha',
  },
  bunny_lines: {
    correct: 'Bunny lines detectadas ✓',
    instruction: 'Franza o nariz — como se sentisse cheiro ruim',
  },
  pucker: {
    correct: 'Contração labial detectada ✓',
    instruction: 'Franza os lábios — como se fosse dar um beijo',
  },
  unknown: {
    correct: '',
    instruction: 'Expressão não reconhecida',
  },
};

/**
 * Hook for detecting facial expressions from MediaPipe landmarks
 */
export function useExpressionDetection(
  landmarks: MediaPipeLandmark[] | null,
  photoType: PhotoType
): ExpressionResult {
  return useMemo(() => {
    const expectedExpression = PHOTO_EXPRESSIONS[photoType];
    
    if (!landmarks || landmarks.length < 468) {
      return {
        detectedExpression: 'unknown',
        expectedExpression,
        isCorrectExpression: false,
        confidence: 0,
        metrics: getEmptyMetrics(),
        feedback: 'Posicione o rosto na câmera',
      };
    }

    const metrics = calculateExpressionMetrics(landmarks);
    const { detectedExpression, confidence } = detectExpression(metrics);
    const isCorrectExpression = detectedExpression === expectedExpression;
    
    const feedbackInfo = EXPRESSION_FEEDBACK[expectedExpression];
    const feedback = isCorrectExpression 
      ? feedbackInfo.correct 
      : feedbackInfo.instruction;

    return {
      detectedExpression,
      expectedExpression,
      isCorrectExpression,
      confidence,
      metrics,
      feedback,
    };
  }, [landmarks, photoType]);
}

/**
 * Calculate detailed expression metrics from landmarks
 */
function calculateExpressionMetrics(landmarks: MediaPipeLandmark[]): ExpressionMetrics {
  // Eye openness calculation
  const leftEyeTop = landmarks[FACE_MESH_LANDMARKS.leftEyeTop];
  const leftEyeBottom = landmarks[FACE_MESH_LANDMARKS.leftEyeBottom];
  const rightEyeTop = landmarks[FACE_MESH_LANDMARKS.rightEyeTop];
  const rightEyeBottom = landmarks[FACE_MESH_LANDMARKS.rightEyeBottom];
  
  const leftEyeOpenness = Math.abs(leftEyeTop.y - leftEyeBottom.y) * 10; // Normalized
  const rightEyeOpenness = Math.abs(rightEyeTop.y - rightEyeBottom.y) * 10;
  const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

  // Eyebrow height (relative to eyes)
  const leftBrowMiddle = landmarks[FACE_MESH_LANDMARKS.leftEyebrowMiddle];
  const rightBrowMiddle = landmarks[FACE_MESH_LANDMARKS.rightEyebrowMiddle];
  const leftEyeCenter = (leftEyeTop.y + leftEyeBottom.y) / 2;
  const rightEyeCenter = (rightEyeTop.y + rightEyeBottom.y) / 2;
  
  const leftBrowHeight = Math.abs(leftEyeCenter - leftBrowMiddle.y);
  const rightBrowHeight = Math.abs(rightEyeCenter - rightBrowMiddle.y);
  const eyebrowHeight = ((leftBrowHeight + rightBrowHeight) / 2) * 10;

  // Eyebrow furrow (glabella compression)
  const leftBrowInner = landmarks[FACE_MESH_LANDMARKS.leftEyebrowInner];
  const rightBrowInner = landmarks[FACE_MESH_LANDMARKS.rightEyebrowInner];
  const glabella = landmarks[FACE_MESH_LANDMARKS.glabella];
  
  const browDistance = Math.abs(rightBrowInner.x - leftBrowInner.x);
  const browLowering = (leftBrowInner.y + rightBrowInner.y) / 2 - glabella.y;
  const eyebrowFurrowed = Math.max(0, Math.min(1, (0.08 - browDistance) * 10 + browLowering * 5));

  // Mouth openness
  const upperLip = landmarks[FACE_MESH_LANDMARKS.upperLipTop];
  const lowerLip = landmarks[FACE_MESH_LANDMARKS.lowerLipBottom];
  const mouthOpenness = Math.abs(lowerLip.y - upperLip.y) * 10;

  // Smile width (lip corners distance)
  const leftLipCorner = landmarks[FACE_MESH_LANDMARKS.leftLipCorner];
  const rightLipCorner = landmarks[FACE_MESH_LANDMARKS.rightLipCorner];
  const leftEyeOuter = landmarks[FACE_MESH_LANDMARKS.leftEyeOuter];
  const rightEyeOuter = landmarks[FACE_MESH_LANDMARKS.rightEyeOuter];
  
  const lipWidth = Math.abs(rightLipCorner.x - leftLipCorner.x);
  const eyeWidth = Math.abs(rightEyeOuter.x - leftEyeOuter.x);
  const smileWidth = lipWidth / eyeWidth; // Normalized to eye distance
  
  // Lip corner elevation (for smile detection)
  const lipCenterY = (upperLip.y + lowerLip.y) / 2;
  const leftCornerElevation = lipCenterY - leftLipCorner.y;
  const rightCornerElevation = lipCenterY - rightLipCorner.y;
  const smileElevation = (leftCornerElevation + rightCornerElevation) / 2;

  // Lip pucker (compressed width)
  const lipPucker = Math.max(0, Math.min(1, (0.25 - lipWidth) * 5 + mouthOpenness * 2));

  // Nasal contraction (bunny lines)
  const noseTip = landmarks[FACE_MESH_LANDMARKS.noseTip];
  const noseTop = landmarks[FACE_MESH_LANDMARKS.noseTop];
  const noseCompression = Math.abs(noseTip.y - noseTop.y);
  
  // Detect nose wings moving up (lateral landmarks near nose bridge)
  const leftCheek = landmarks[234]; // Approximate nose wing area
  const rightCheek = landmarks[454];
  const cheekElevation = (leftCheek.y + rightCheek.y) / 2;
  const nasalContraction = Math.max(0, Math.min(1, (noseTop.y - cheekElevation) * 20));

  return {
    eyeOpenness: Math.min(1, eyeOpenness),
    leftEyeOpenness: Math.min(1, leftEyeOpenness),
    rightEyeOpenness: Math.min(1, rightEyeOpenness),
    eyebrowHeight: Math.min(1, eyebrowHeight),
    eyebrowFurrowed: Math.max(0, Math.min(1, eyebrowFurrowed)),
    mouthOpenness: Math.min(1, mouthOpenness),
    smileWidth: smileWidth + (smileElevation > 0 ? smileElevation * 2 : 0),
    lipPucker,
    nasalContraction,
  };
}

/**
 * Detect expression type from metrics
 */
function detectExpression(metrics: ExpressionMetrics): { detectedExpression: ExpressionType; confidence: number } {
  const scores: Record<ExpressionType, number> = {
    neutral: 0,
    frown: 0,
    surprise: 0,
    smile: 0,
    bunny_lines: 0,
    pucker: 0,
    unknown: 0,
  };

  // Neutral: relaxed face, moderate values
  scores.neutral = 
    (1 - metrics.eyebrowFurrowed) * 0.3 +
    (metrics.eyebrowHeight < 0.5 ? 0.3 : 0) +
    (metrics.smileWidth < 1.1 ? 0.2 : 0) +
    (1 - metrics.lipPucker) * 0.2;

  // Frown: furrowed brows, lowered eyebrows
  scores.frown = 
    metrics.eyebrowFurrowed * 0.6 +
    (metrics.eyebrowHeight < 0.4 ? 0.3 : 0) +
    (1 - metrics.smileWidth / 1.2) * 0.1;

  // Surprise: raised eyebrows, wide eyes
  scores.surprise = 
    (metrics.eyebrowHeight > 0.5 ? metrics.eyebrowHeight : 0) * 0.5 +
    (metrics.eyeOpenness > 0.6 ? 0.3 : 0) +
    (1 - metrics.eyebrowFurrowed) * 0.2;

  // Smile: wide mouth, elevated corners
  scores.smile = 
    (metrics.smileWidth > 1.0 ? (metrics.smileWidth - 1.0) * 2 : 0) * 0.5 +
    (metrics.mouthOpenness > 0.2 ? 0.2 : 0) +
    (metrics.eyeOpenness < 0.8 ? 0.2 : 0) + // Slight eye squint in genuine smile
    (1 - metrics.eyebrowFurrowed) * 0.1;

  // Bunny lines: nose contracted
  scores.bunny_lines = 
    metrics.nasalContraction * 0.7 +
    (metrics.eyebrowFurrowed > 0.3 ? 0.2 : 0) +
    (1 - metrics.smileWidth / 1.2) * 0.1;

  // Pucker: compressed lips
  scores.pucker = 
    metrics.lipPucker * 0.6 +
    (metrics.mouthOpenness < 0.3 ? 0.2 : 0) +
    (1 - metrics.smileWidth / 1.1) * 0.2;

  // Find highest scoring expression
  let maxScore = 0;
  let detectedExpression: ExpressionType = 'unknown';
  
  for (const [expression, score] of Object.entries(scores)) {
    if (score > maxScore && expression !== 'unknown') {
      maxScore = score;
      detectedExpression = expression as ExpressionType;
    }
  }

  // Require minimum confidence threshold
  if (maxScore < 0.4) {
    return { detectedExpression: 'unknown', confidence: maxScore };
  }

  return { detectedExpression, confidence: Math.min(1, maxScore) };
}

/**
 * Get empty metrics for initialization
 */
function getEmptyMetrics(): ExpressionMetrics {
  return {
    eyeOpenness: 0,
    leftEyeOpenness: 0,
    rightEyeOpenness: 0,
    eyebrowHeight: 0,
    eyebrowFurrowed: 0,
    mouthOpenness: 0,
    smileWidth: 0,
    lipPucker: 0,
    nasalContraction: 0,
  };
}
