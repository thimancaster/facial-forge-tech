import { PhotoType } from "@/components/CameraCapture";
import { MediaPipeLandmark, FaceMeshResult, FACE_MESH_LANDMARKS } from "@/hooks/useMediaPipeFaceMesh";
import { cn } from "@/lib/utils";

interface DynamicFaceMeshOverlayProps {
  photoType: PhotoType;
  faceMesh: FaceMeshResult | null;
  containerWidth: number;
  containerHeight: number;
  qualityScore: number;
  showLandmarks?: boolean;
  showConnections?: boolean;
  isMirrored?: boolean;
}

// Photo-specific landmark visualizations
const PHOTO_LANDMARKS_CONFIG: Record<PhotoType, {
  highlightRegions: string[];
  showMediopupilarLine: boolean;
  showGlabellarZone: boolean;
  showFrontalZone: boolean;
  showCrowsFeetZone: boolean;
  showPerioralZone: boolean;
  showNasalZone: boolean;
}> = {
  resting: {
    highlightRegions: ['eyes', 'eyebrows'],
    showMediopupilarLine: true,
    showGlabellarZone: false,
    showFrontalZone: false,
    showCrowsFeetZone: false,
    showPerioralZone: false,
    showNasalZone: false,
  },
  glabellar: {
    highlightRegions: ['eyebrows', 'glabella'],
    showMediopupilarLine: true,
    showGlabellarZone: true,
    showFrontalZone: false,
    showCrowsFeetZone: false,
    showPerioralZone: false,
    showNasalZone: false,
  },
  frontal: {
    highlightRegions: ['forehead', 'eyebrows'],
    showMediopupilarLine: true,
    showGlabellarZone: false,
    showFrontalZone: true,
    showCrowsFeetZone: false,
    showPerioralZone: false,
    showNasalZone: false,
  },
  smile: {
    highlightRegions: ['eyes', 'crowsFeet'],
    showMediopupilarLine: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    showCrowsFeetZone: true,
    showPerioralZone: false,
    showNasalZone: false,
  },
  nasal: {
    highlightRegions: ['nose'],
    showMediopupilarLine: true,
    showGlabellarZone: false,
    showFrontalZone: false,
    showCrowsFeetZone: false,
    showPerioralZone: false,
    showNasalZone: true,
  },
  perioral: {
    highlightRegions: ['lips'],
    showMediopupilarLine: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    showCrowsFeetZone: false,
    showPerioralZone: true,
    showNasalZone: false,
  },
  profile_left: {
    highlightRegions: [],
    showMediopupilarLine: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    showCrowsFeetZone: false,
    showPerioralZone: false,
    showNasalZone: false,
  },
  profile_right: {
    highlightRegions: [],
    showMediopupilarLine: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    showCrowsFeetZone: false,
    showPerioralZone: false,
    showNasalZone: false,
  },
};

export function DynamicFaceMeshOverlay({
  photoType,
  faceMesh,
  containerWidth,
  containerHeight,
  qualityScore,
  showLandmarks = false,
  showConnections = false,
  isMirrored = true,
}: DynamicFaceMeshOverlayProps) {
  if (!faceMesh) return null;

  const config = PHOTO_LANDMARKS_CONFIG[photoType];
  const { landmarks, leftEye, rightEye, leftEyebrow, rightEyebrow, lips, faceOval } = faceMesh;

  // Convert normalized coordinates to pixel coordinates
  const toPixel = (point: MediaPipeLandmark) => {
    const x = isMirrored ? (1 - point.x) * containerWidth : point.x * containerWidth;
    const y = point.y * containerHeight;
    return { x, y };
  };

  // Get color based on quality score
  const getQualityColor = () => {
    if (qualityScore >= 75) return 'rgba(34, 197, 94, 0.8)';
    if (qualityScore >= 50) return 'rgba(234, 179, 8, 0.8)';
    if (qualityScore >= 25) return 'rgba(249, 115, 22, 0.8)';
    return 'rgba(239, 68, 68, 0.8)';
  };

  // Get key landmarks
  const leftEyeCenter = landmarks[FACE_MESH_LANDMARKS.leftEyeOuter];
  const rightEyeCenter = landmarks[FACE_MESH_LANDMARKS.rightEyeOuter];
  const leftEyeInner = landmarks[FACE_MESH_LANDMARKS.leftEyeInner];
  const rightEyeInner = landmarks[FACE_MESH_LANDMARKS.rightEyeInner];
  const noseTip = landmarks[FACE_MESH_LANDMARKS.noseTip];
  const glabella = landmarks[FACE_MESH_LANDMARKS.glabella];
  const forehead = landmarks[FACE_MESH_LANDMARKS.forehead];
  const chin = landmarks[FACE_MESH_LANDMARKS.chin];
  const leftBrowMiddle = landmarks[FACE_MESH_LANDMARKS.leftEyebrowMiddle];
  const rightBrowMiddle = landmarks[FACE_MESH_LANDMARKS.rightEyebrowMiddle];

  // Calculate dynamic reference lines
  const leftPupilPos = toPixel(leftEyeCenter);
  const rightPupilPos = toPixel(rightEyeCenter);
  const glabellaPos = toPixel(glabella);
  const foreheadPos = toPixel(forehead);
  const nosePos = toPixel(noseTip);
  const chinPos = toPixel(chin);
  const leftBrowPos = toPixel(leftBrowMiddle);
  const rightBrowPos = toPixel(rightBrowMiddle);

  // Mediopupilar lines (through pupil centers)
  const eyeLevel = (leftPupilPos.y + rightPupilPos.y) / 2;

  // 2cm above brow line (estimated as ~10% of face height above brows)
  const faceHeight = chinPos.y - foreheadPos.y;
  const browLine = (leftBrowPos.y + rightBrowPos.y) / 2;
  const twoAboveBrow = browLine - faceHeight * 0.08;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="meshGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="zoneHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
          <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
        </linearGradient>
      </defs>

      {/* Face oval outline */}
      {showConnections && faceOval.length > 0 && (
        <polygon
          points={faceOval.map(p => {
            const px = toPixel(p);
            return `${px.x},${px.y}`;
          }).join(' ')}
          fill="none"
          stroke={getQualityColor()}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          filter="url(#meshGlow)"
        />
      )}

      {/* Dynamic mediopupilar lines */}
      {config.showMediopupilarLine && leftEyeCenter && rightEyeCenter && (
        <>
          {/* Left mediopupilar line */}
          <line
            x1={leftPupilPos.x}
            y1={containerHeight * 0.1}
            x2={leftPupilPos.x}
            y2={containerHeight * 0.9}
            stroke="rgba(147, 51, 234, 0.5)"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          {/* Right mediopupilar line */}
          <line
            x1={rightPupilPos.x}
            y1={containerHeight * 0.1}
            x2={rightPupilPos.x}
            y2={containerHeight * 0.9}
            stroke="rgba(147, 51, 234, 0.5)"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          {/* Labels */}
          <text
            x={leftPupilPos.x}
            y={containerHeight * 0.08}
            fill="rgba(147, 51, 234, 0.9)"
            fontSize="10"
            textAnchor="middle"
            fontWeight="bold"
          >
            MP
          </text>
          <text
            x={rightPupilPos.x}
            y={containerHeight * 0.08}
            fill="rgba(147, 51, 234, 0.9)"
            fontSize="10"
            textAnchor="middle"
            fontWeight="bold"
          >
            MP
          </text>
        </>
      )}

      {/* Central nasion line */}
      {(config.showGlabellarZone || config.showNasalZone) && glabella && (
        <>
          <line
            x1={glabellaPos.x}
            y1={foreheadPos.y}
            x2={nosePos.x}
            y2={chinPos.y}
            stroke="rgba(34, 197, 94, 0.6)"
            strokeWidth="1.5"
            strokeDasharray="8 4"
          />
          <text
            x={glabellaPos.x}
            y={foreheadPos.y - 5}
            fill="rgba(34, 197, 94, 0.9)"
            fontSize="9"
            textAnchor="middle"
          >
            NASION
          </text>
        </>
      )}

      {/* Eye level line */}
      <line
        x1={containerWidth * 0.15}
        y1={eyeLevel}
        x2={containerWidth * 0.85}
        y2={eyeLevel}
        stroke="rgba(59, 130, 246, 0.4)"
        strokeWidth="1"
        strokeDasharray="4 2"
      />

      {/* 2cm above brow line (for frontal/glabellar) */}
      {(config.showFrontalZone || config.showGlabellarZone) && (
        <>
          <line
            x1={leftPupilPos.x - 50}
            y1={twoAboveBrow}
            x2={rightPupilPos.x + 50}
            y2={twoAboveBrow}
            stroke="rgba(249, 115, 22, 0.7)"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
          <text
            x={rightPupilPos.x + 55}
            y={twoAboveBrow + 4}
            fill="rgba(249, 115, 22, 0.9)"
            fontSize="10"
            fontWeight="bold"
          >
            2cm
          </text>
        </>
      )}

      {/* Glabellar zone highlight */}
      {config.showGlabellarZone && glabella && (
        <ellipse
          cx={glabellaPos.x}
          cy={(leftBrowPos.y + rightBrowPos.y) / 2 + 10}
          rx={Math.abs(rightPupilPos.x - leftPupilPos.x) * 0.35}
          ry={faceHeight * 0.08}
          fill="url(#zoneHighlight)"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth="1"
          className="animate-pulse"
        />
      )}

      {/* Frontal zone highlight */}
      {config.showFrontalZone && (
        <rect
          x={leftPupilPos.x - 30}
          y={foreheadPos.y}
          width={Math.abs(rightPupilPos.x - leftPupilPos.x) + 60}
          height={browLine - foreheadPos.y}
          rx="8"
          fill="url(#zoneHighlight)"
          className="animate-pulse"
        />
      )}

      {/* Crow's feet zones */}
      {config.showCrowsFeetZone && (
        <>
          <ellipse
            cx={leftPupilPos.x - Math.abs(rightPupilPos.x - leftPupilPos.x) * 0.3}
            cy={eyeLevel}
            rx={containerWidth * 0.05}
            ry={containerHeight * 0.06}
            fill="rgba(59, 130, 246, 0.25)"
            className="animate-pulse"
          />
          <ellipse
            cx={rightPupilPos.x + Math.abs(rightPupilPos.x - leftPupilPos.x) * 0.3}
            cy={eyeLevel}
            rx={containerWidth * 0.05}
            ry={containerHeight * 0.06}
            fill="rgba(59, 130, 246, 0.25)"
            className="animate-pulse"
          />
        </>
      )}

      {/* Perioral zone */}
      {config.showPerioralZone && lips.length > 0 && (
        <ellipse
          cx={(toPixel(lips[0]).x + toPixel(lips[10]).x) / 2}
          cy={(toPixel(lips[0]).y + toPixel(lips[10]).y) / 2}
          rx={containerWidth * 0.12}
          ry={containerHeight * 0.08}
          fill="rgba(236, 72, 153, 0.2)"
          stroke="rgba(236, 72, 153, 0.5)"
          strokeWidth="1"
          className="animate-pulse"
        />
      )}

      {/* Nasal zone */}
      {config.showNasalZone && noseTip && (
        <ellipse
          cx={nosePos.x}
          cy={nosePos.y - faceHeight * 0.05}
          rx={containerWidth * 0.08}
          ry={containerHeight * 0.1}
          fill="rgba(34, 197, 94, 0.2)"
          stroke="rgba(34, 197, 94, 0.5)"
          strokeWidth="1"
          className="animate-pulse"
        />
      )}

      {/* Eye contours */}
      {showLandmarks && leftEye.length > 0 && (
        <polygon
          points={leftEye.map(p => {
            const px = toPixel(p);
            return `${px.x},${px.y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth="1"
        />
      )}
      {showLandmarks && rightEye.length > 0 && (
        <polygon
          points={rightEye.map(p => {
            const px = toPixel(p);
            return `${px.x},${px.y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth="1"
        />
      )}

      {/* Eyebrow contours */}
      {showLandmarks && leftEyebrow.length > 0 && (
        <polyline
          points={leftEyebrow.map(p => {
            const px = toPixel(p);
            return `${px.x},${px.y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(249, 115, 22, 0.6)"
          strokeWidth="1.5"
        />
      )}
      {showLandmarks && rightEyebrow.length > 0 && (
        <polyline
          points={rightEyebrow.map(p => {
            const px = toPixel(p);
            return `${px.x},${px.y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(249, 115, 22, 0.6)"
          strokeWidth="1.5"
        />
      )}

      {/* Lip contour */}
      {showLandmarks && lips.length > 0 && (
        <polygon
          points={lips.map(p => {
            const px = toPixel(p);
            return `${px.x},${px.y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(236, 72, 153, 0.6)"
          strokeWidth="1"
        />
      )}

      {/* Key landmark points */}
      {showLandmarks && (
        <>
          {[noseTip, glabella, forehead, chin, leftBrowMiddle, rightBrowMiddle].map((lm, i) => {
            if (!lm) return null;
            const pos = toPixel(lm);
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r="3"
                fill={getQualityColor()}
              />
            );
          })}
        </>
      )}
    </svg>
  );
}
