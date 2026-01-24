import { useMemo, useCallback } from 'react';
import { MediaPipeLandmark, FACE_MESH_LANDMARKS } from './useMediaPipeFaceMesh';

/**
 * Landmark consistency result
 */
export interface LandmarkConsistencyResult {
  isConsistent: boolean;
  overallScore: number;         // 0-100
  positionScore: number;        // How well face position matches
  scaleScore: number;           // How well face size matches
  rotationScore: number;        // How well face angle matches
  deviations: LandmarkDeviations;
  feedback: string[];
}

/**
 * Detailed deviations from reference
 */
export interface LandmarkDeviations {
  horizontalOffset: number;     // -1 to 1 (negative = left of reference)
  verticalOffset: number;       // -1 to 1 (negative = above reference)
  scaleRatio: number;           // < 1 = smaller, > 1 = larger
  rollAngle: number;            // Head tilt in degrees
  yawAngle: number;             // Left/right rotation in degrees
}

/**
 * Reference landmarks to store from previous session
 */
export interface StoredLandmarkReference {
  // Key anatomical points (normalized 0-1)
  leftEyeOuter: { x: number; y: number };
  rightEyeOuter: { x: number; y: number };
  noseTip: { x: number; y: number };
  chin: { x: number; y: number };
  forehead: { x: number; y: number };
  leftLipCorner: { x: number; y: number };
  rightLipCorner: { x: number; y: number };
  
  // Computed metrics for comparison
  faceWidth: number;            // Distance between eye outers
  faceHeight: number;           // Distance forehead to chin
  faceCenter: { x: number; y: number };
  rollAngle: number;            // Head tilt at capture time
  
  // Metadata
  capturedAt: string;
  photoType: string;
}

/**
 * Thresholds for consistency scoring
 */
const CONSISTENCY_THRESHOLDS = {
  positionTolerance: 0.08,      // Max 8% offset for "consistent"
  scaleTolerance: 0.15,         // Max 15% size difference
  rollTolerance: 5,             // Max 5° head tilt difference
  yawTolerance: 10,             // Max 10° yaw difference
};

/**
 * Hook for comparing current landmarks with a stored reference
 */
export function useLandmarkConsistency(
  currentLandmarks: MediaPipeLandmark[] | null,
  referenceLandmarks: StoredLandmarkReference | null
): LandmarkConsistencyResult {
  return useMemo(() => {
    if (!currentLandmarks || currentLandmarks.length < 468 || !referenceLandmarks) {
      return getEmptyResult(referenceLandmarks === null);
    }

    // Extract current key landmarks
    const current = extractKeyLandmarks(currentLandmarks);
    const reference = referenceLandmarks;

    // Calculate deviations
    const deviations = calculateDeviations(current, reference);

    // Calculate scores
    const positionScore = calculatePositionScore(deviations);
    const scaleScore = calculateScaleScore(deviations);
    const rotationScore = calculateRotationScore(deviations);

    // Overall weighted score
    const overallScore = Math.round(
      positionScore * 0.4 +
      scaleScore * 0.35 +
      rotationScore * 0.25
    );

    const isConsistent = overallScore >= 70;

    // Generate feedback
    const feedback = generateFeedback(deviations, positionScore, scaleScore, rotationScore);

    return {
      isConsistent,
      overallScore,
      positionScore: Math.round(positionScore),
      scaleScore: Math.round(scaleScore),
      rotationScore: Math.round(rotationScore),
      deviations,
      feedback,
    };
  }, [currentLandmarks, referenceLandmarks]);
}

/**
 * Extract key landmarks from full 468-point mesh
 */
function extractKeyLandmarks(landmarks: MediaPipeLandmark[]): StoredLandmarkReference {
  const leftEyeOuter = landmarks[FACE_MESH_LANDMARKS.leftEyeOuter];
  const rightEyeOuter = landmarks[FACE_MESH_LANDMARKS.rightEyeOuter];
  const noseTip = landmarks[FACE_MESH_LANDMARKS.noseTip];
  const chin = landmarks[FACE_MESH_LANDMARKS.chin];
  const forehead = landmarks[FACE_MESH_LANDMARKS.forehead];
  const leftLipCorner = landmarks[FACE_MESH_LANDMARKS.leftLipCorner];
  const rightLipCorner = landmarks[FACE_MESH_LANDMARKS.rightLipCorner];

  const faceWidth = Math.hypot(
    rightEyeOuter.x - leftEyeOuter.x,
    rightEyeOuter.y - leftEyeOuter.y
  );
  
  const faceHeight = Math.hypot(
    chin.x - forehead.x,
    chin.y - forehead.y
  );

  const faceCenter = {
    x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
    y: (forehead.y + chin.y) / 2,
  };

  const eyesDeltaY = rightEyeOuter.y - leftEyeOuter.y;
  const eyesDeltaX = rightEyeOuter.x - leftEyeOuter.x;
  const rollAngle = Math.atan2(eyesDeltaY, eyesDeltaX) * (180 / Math.PI);

  return {
    leftEyeOuter: { x: leftEyeOuter.x, y: leftEyeOuter.y },
    rightEyeOuter: { x: rightEyeOuter.x, y: rightEyeOuter.y },
    noseTip: { x: noseTip.x, y: noseTip.y },
    chin: { x: chin.x, y: chin.y },
    forehead: { x: forehead.x, y: forehead.y },
    leftLipCorner: { x: leftLipCorner.x, y: leftLipCorner.y },
    rightLipCorner: { x: rightLipCorner.x, y: rightLipCorner.y },
    faceWidth,
    faceHeight,
    faceCenter,
    rollAngle,
    capturedAt: new Date().toISOString(),
    photoType: '',
  };
}

/**
 * Calculate deviations between current and reference
 */
function calculateDeviations(
  current: StoredLandmarkReference,
  reference: StoredLandmarkReference
): LandmarkDeviations {
  return {
    horizontalOffset: current.faceCenter.x - reference.faceCenter.x,
    verticalOffset: current.faceCenter.y - reference.faceCenter.y,
    scaleRatio: current.faceWidth / reference.faceWidth,
    rollAngle: current.rollAngle - reference.rollAngle,
    yawAngle: calculateYawDifference(current, reference),
  };
}

/**
 * Estimate yaw difference from nose position relative to eyes
 */
function calculateYawDifference(
  current: StoredLandmarkReference,
  reference: StoredLandmarkReference
): number {
  const currentNoseOffset = current.noseTip.x - current.faceCenter.x;
  const referenceNoseOffset = reference.noseTip.x - reference.faceCenter.x;
  
  // Convert to approximate degrees (rough estimate)
  return (currentNoseOffset - referenceNoseOffset) * 100;
}

/**
 * Calculate position matching score (0-100)
 */
function calculatePositionScore(deviations: LandmarkDeviations): number {
  const horizontalPenalty = Math.abs(deviations.horizontalOffset) / CONSISTENCY_THRESHOLDS.positionTolerance;
  const verticalPenalty = Math.abs(deviations.verticalOffset) / CONSISTENCY_THRESHOLDS.positionTolerance;
  
  const totalPenalty = Math.min(1, (horizontalPenalty + verticalPenalty) / 2);
  return 100 * (1 - totalPenalty);
}

/**
 * Calculate scale matching score (0-100)
 */
function calculateScaleScore(deviations: LandmarkDeviations): number {
  const scaleDiff = Math.abs(1 - deviations.scaleRatio);
  const scalePenalty = scaleDiff / CONSISTENCY_THRESHOLDS.scaleTolerance;
  
  return 100 * (1 - Math.min(1, scalePenalty));
}

/**
 * Calculate rotation matching score (0-100)
 */
function calculateRotationScore(deviations: LandmarkDeviations): number {
  const rollPenalty = Math.abs(deviations.rollAngle) / CONSISTENCY_THRESHOLDS.rollTolerance;
  const yawPenalty = Math.abs(deviations.yawAngle) / CONSISTENCY_THRESHOLDS.yawTolerance;
  
  const totalPenalty = Math.min(1, (rollPenalty + yawPenalty) / 2);
  return 100 * (1 - totalPenalty);
}

/**
 * Generate user-friendly feedback messages
 */
function generateFeedback(
  deviations: LandmarkDeviations,
  positionScore: number,
  scaleScore: number,
  rotationScore: number
): string[] {
  const feedback: string[] = [];

  // Position feedback
  if (positionScore < 70) {
    if (deviations.horizontalOffset > CONSISTENCY_THRESHOLDS.positionTolerance) {
      feedback.push('Mova o rosto para a esquerda');
    } else if (deviations.horizontalOffset < -CONSISTENCY_THRESHOLDS.positionTolerance) {
      feedback.push('Mova o rosto para a direita');
    }
    
    if (deviations.verticalOffset > CONSISTENCY_THRESHOLDS.positionTolerance) {
      feedback.push('Mova o rosto para cima');
    } else if (deviations.verticalOffset < -CONSISTENCY_THRESHOLDS.positionTolerance) {
      feedback.push('Mova o rosto para baixo');
    }
  }

  // Scale feedback
  if (scaleScore < 70) {
    if (deviations.scaleRatio < 1 - CONSISTENCY_THRESHOLDS.scaleTolerance) {
      feedback.push('Aproxime-se da câmera (rosto menor que referência)');
    } else if (deviations.scaleRatio > 1 + CONSISTENCY_THRESHOLDS.scaleTolerance) {
      feedback.push('Afaste-se da câmera (rosto maior que referência)');
    }
  }

  // Rotation feedback
  if (rotationScore < 70) {
    if (deviations.rollAngle > CONSISTENCY_THRESHOLDS.rollTolerance) {
      feedback.push('Incline a cabeça para a esquerda');
    } else if (deviations.rollAngle < -CONSISTENCY_THRESHOLDS.rollTolerance) {
      feedback.push('Incline a cabeça para a direita');
    }
    
    if (Math.abs(deviations.yawAngle) > CONSISTENCY_THRESHOLDS.yawTolerance) {
      feedback.push(deviations.yawAngle > 0 ? 'Vire o rosto para a esquerda' : 'Vire o rosto para a direita');
    }
  }

  if (feedback.length === 0) {
    feedback.push('Posição consistente com foto anterior ✓');
  }

  return feedback;
}

/**
 * Get empty result when no comparison possible
 */
function getEmptyResult(noReference: boolean): LandmarkConsistencyResult {
  return {
    isConsistent: noReference, // If no reference, consider "consistent" (first session)
    overallScore: noReference ? 100 : 0,
    positionScore: noReference ? 100 : 0,
    scaleScore: noReference ? 100 : 0,
    rotationScore: noReference ? 100 : 0,
    deviations: {
      horizontalOffset: 0,
      verticalOffset: 0,
      scaleRatio: 1,
      rollAngle: 0,
      yawAngle: 0,
    },
    feedback: noReference 
      ? ['Primeira sessão — sem referência anterior'] 
      : ['Posicione o rosto na câmera'],
  };
}

/**
 * Helper to create storable reference from current landmarks
 */
export function createLandmarkReference(
  landmarks: MediaPipeLandmark[],
  photoType: string
): StoredLandmarkReference | null {
  if (!landmarks || landmarks.length < 468) return null;
  
  const reference = extractKeyLandmarks(landmarks);
  reference.photoType = photoType;
  
  return reference;
}
