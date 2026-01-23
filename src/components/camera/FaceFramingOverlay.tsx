import { PhotoType } from "@/components/CameraCapture";
import { FaceQuality, FaceLandmarks } from "@/hooks/useFaceDetection";
import { cn } from "@/lib/utils";

interface FaceFramingOverlayProps {
  photoType: PhotoType;
  quality: FaceQuality;
  landmarks: FaceLandmarks | null;
  containerWidth: number;
  containerHeight: number;
}

// Photo-specific framing configurations
const FRAMING_CONFIG: Record<PhotoType, {
  faceScale: number; // Expected face size relative to frame
  faceOffsetY: number; // Vertical offset (-1 to 1, 0 = center)
  showGrid: boolean;
  showMediopupilarLine: boolean;
  showNasionLine: boolean;
  showEyeLevel: boolean;
  showBrowLine: boolean;
  showLipLine: boolean;
  showCrowsFeetZone: boolean;
  showGlabellarZone: boolean;
  showFrontalZone: boolean;
  rotationGuide: number; // Expected rotation in degrees (for profiles)
}> = {
  resting: {
    faceScale: 0.55,
    faceOffsetY: -0.05,
    showGrid: true,
    showMediopupilarLine: true,
    showNasionLine: true,
    showEyeLevel: true,
    showBrowLine: false,
    showLipLine: false,
    showCrowsFeetZone: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    rotationGuide: 0,
  },
  glabellar: {
    faceScale: 0.6,
    faceOffsetY: -0.1,
    showGrid: true,
    showMediopupilarLine: true,
    showNasionLine: true,
    showEyeLevel: true,
    showBrowLine: true,
    showLipLine: false,
    showCrowsFeetZone: false,
    showGlabellarZone: true,
    showFrontalZone: false,
    rotationGuide: 0,
  },
  frontal: {
    faceScale: 0.6,
    faceOffsetY: -0.15,
    showGrid: true,
    showMediopupilarLine: true,
    showNasionLine: true,
    showEyeLevel: true,
    showBrowLine: true,
    showLipLine: false,
    showCrowsFeetZone: false,
    showGlabellarZone: false,
    showFrontalZone: true,
    rotationGuide: 0,
  },
  smile: {
    faceScale: 0.55,
    faceOffsetY: 0,
    showGrid: true,
    showMediopupilarLine: true,
    showNasionLine: false,
    showEyeLevel: true,
    showBrowLine: false,
    showLipLine: false,
    showCrowsFeetZone: true,
    showGlabellarZone: false,
    showFrontalZone: false,
    rotationGuide: 0,
  },
  nasal: {
    faceScale: 0.65,
    faceOffsetY: 0,
    showGrid: true,
    showMediopupilarLine: true,
    showNasionLine: true,
    showEyeLevel: false,
    showBrowLine: false,
    showLipLine: false,
    showCrowsFeetZone: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    rotationGuide: 0,
  },
  perioral: {
    faceScale: 0.65,
    faceOffsetY: 0.1,
    showGrid: true,
    showMediopupilarLine: false,
    showNasionLine: true,
    showEyeLevel: false,
    showBrowLine: false,
    showLipLine: true,
    showCrowsFeetZone: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    rotationGuide: 0,
  },
  profile_left: {
    faceScale: 0.55,
    faceOffsetY: 0,
    showGrid: false,
    showMediopupilarLine: false,
    showNasionLine: false,
    showEyeLevel: true,
    showBrowLine: false,
    showLipLine: false,
    showCrowsFeetZone: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    rotationGuide: 90,
  },
  profile_right: {
    faceScale: 0.55,
    faceOffsetY: 0,
    showGrid: false,
    showMediopupilarLine: false,
    showNasionLine: false,
    showEyeLevel: true,
    showBrowLine: false,
    showLipLine: false,
    showCrowsFeetZone: false,
    showGlabellarZone: false,
    showFrontalZone: false,
    rotationGuide: -90,
  },
};

export function FaceFramingOverlay({
  photoType,
  quality,
  landmarks,
  containerWidth,
  containerHeight,
}: FaceFramingOverlayProps) {
  const config = FRAMING_CONFIG[photoType];
  const isProfile = photoType === 'profile_left' || photoType === 'profile_right';
  
  // Calculate frame dimensions
  const frameWidth = containerWidth * 0.7;
  const frameHeight = containerHeight * config.faceScale * 1.3;
  const frameX = (containerWidth - frameWidth) / 2;
  const frameY = (containerHeight - frameHeight) / 2 + (containerHeight * config.faceOffsetY * 0.2);

  // Determine border color based on quality
  const getBorderColor = () => {
    if (quality.overallScore >= 75) return 'stroke-green-500';
    if (quality.overallScore >= 50) return 'stroke-yellow-500';
    if (quality.overallScore >= 25) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const getGlowColor = () => {
    if (quality.overallScore >= 75) return 'drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]';
    if (quality.overallScore >= 50) return 'drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]';
    if (quality.overallScore >= 25) return 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]';
    return 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]';
  };

  return (
    <svg
      className={cn("absolute inset-0 pointer-events-none", getGlowColor())}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Gradient for zone highlights */}
        <linearGradient id="zoneGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
          <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Main face frame - oval for frontal, modified for profiles */}
      {isProfile ? (
        <ellipse
          cx={containerWidth / 2 + (photoType === 'profile_left' ? -20 : 20)}
          cy={containerHeight / 2 + frameHeight * config.faceOffsetY * 0.3}
          rx={frameWidth * 0.35}
          ry={frameHeight * 0.5}
          fill="none"
          className={cn("transition-colors duration-300", getBorderColor())}
          strokeWidth="2"
          strokeDasharray="8 4"
          filter="url(#glow)"
        />
      ) : (
        <ellipse
          cx={containerWidth / 2}
          cy={containerHeight / 2 + frameHeight * config.faceOffsetY * 0.3}
          rx={frameWidth * 0.42}
          ry={frameHeight * 0.52}
          fill="none"
          className={cn("transition-colors duration-300", getBorderColor())}
          strokeWidth="2"
          strokeDasharray="8 4"
          filter="url(#glow)"
        />
      )}

      {/* Anatomical reference lines */}
      {config.showMediopupilarLine && !isProfile && (
        <>
          {/* Left mediopupilar line */}
          <line
            x1={containerWidth * 0.35}
            y1={containerHeight * 0.15}
            x2={containerWidth * 0.35}
            y2={containerHeight * 0.85}
            stroke="rgba(147, 51, 234, 0.4)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* Right mediopupilar line */}
          <line
            x1={containerWidth * 0.65}
            y1={containerHeight * 0.15}
            x2={containerWidth * 0.65}
            y2={containerHeight * 0.85}
            stroke="rgba(147, 51, 234, 0.4)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* Labels */}
          <text
            x={containerWidth * 0.35}
            y={containerHeight * 0.12}
            fill="rgba(147, 51, 234, 0.7)"
            fontSize="10"
            textAnchor="middle"
          >
            MP
          </text>
          <text
            x={containerWidth * 0.65}
            y={containerHeight * 0.12}
            fill="rgba(147, 51, 234, 0.7)"
            fontSize="10"
            textAnchor="middle"
          >
            MP
          </text>
        </>
      )}

      {/* Nasion/Center line */}
      {config.showNasionLine && !isProfile && (
        <>
          <line
            x1={containerWidth / 2}
            y1={containerHeight * 0.15}
            x2={containerWidth / 2}
            y2={containerHeight * 0.85}
            stroke="rgba(34, 197, 94, 0.5)"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <text
            x={containerWidth / 2}
            y={containerHeight * 0.12}
            fill="rgba(34, 197, 94, 0.8)"
            fontSize="10"
            textAnchor="middle"
          >
            NASION
          </text>
        </>
      )}

      {/* Eye level line */}
      {config.showEyeLevel && (
        <line
          x1={containerWidth * 0.2}
          y1={containerHeight * 0.38}
          x2={containerWidth * 0.8}
          y2={containerHeight * 0.38}
          stroke="rgba(59, 130, 246, 0.5)"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      )}

      {/* Brow line (2cm rule visualization) */}
      {config.showBrowLine && (
        <>
          <line
            x1={containerWidth * 0.25}
            y1={containerHeight * 0.28}
            x2={containerWidth * 0.75}
            y2={containerHeight * 0.28}
            stroke="rgba(249, 115, 22, 0.6)"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <text
            x={containerWidth * 0.82}
            y={containerHeight * 0.28}
            fill="rgba(249, 115, 22, 0.8)"
            fontSize="9"
            dominantBaseline="middle"
          >
            2cm
          </text>
        </>
      )}

      {/* Lip line */}
      {config.showLipLine && (
        <line
          x1={containerWidth * 0.3}
          y1={containerHeight * 0.62}
          x2={containerWidth * 0.7}
          y2={containerHeight * 0.62}
          stroke="rgba(236, 72, 153, 0.5)"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      )}

      {/* Glabellar zone highlight */}
      {config.showGlabellarZone && (
        <rect
          x={containerWidth * 0.38}
          y={containerHeight * 0.28}
          width={containerWidth * 0.24}
          height={containerHeight * 0.12}
          fill="url(#zoneGradient)"
          rx="4"
          className="animate-pulse"
        />
      )}

      {/* Frontal zone highlight */}
      {config.showFrontalZone && (
        <rect
          x={containerWidth * 0.28}
          y={containerHeight * 0.15}
          width={containerWidth * 0.44}
          height={containerHeight * 0.12}
          fill="url(#zoneGradient)"
          rx="4"
          className="animate-pulse"
        />
      )}

      {/* Crow's feet zones */}
      {config.showCrowsFeetZone && (
        <>
          {/* Left */}
          <ellipse
            cx={containerWidth * 0.22}
            cy={containerHeight * 0.38}
            rx={containerWidth * 0.06}
            ry={containerHeight * 0.08}
            fill="rgba(59, 130, 246, 0.2)"
            className="animate-pulse"
          />
          {/* Right */}
          <ellipse
            cx={containerWidth * 0.78}
            cy={containerHeight * 0.38}
            rx={containerWidth * 0.06}
            ry={containerHeight * 0.08}
            fill="rgba(59, 130, 246, 0.2)"
            className="animate-pulse"
          />
        </>
      )}

      {/* Corner markers */}
      <g stroke="currentColor" strokeWidth="2" className={cn("transition-colors", getBorderColor())}>
        {/* Top left */}
        <path d={`M ${frameX + 20} ${frameY} L ${frameX} ${frameY} L ${frameX} ${frameY + 20}`} fill="none" />
        {/* Top right */}
        <path d={`M ${frameX + frameWidth - 20} ${frameY} L ${frameX + frameWidth} ${frameY} L ${frameX + frameWidth} ${frameY + 20}`} fill="none" />
        {/* Bottom left */}
        <path d={`M ${frameX + 20} ${frameY + frameHeight} L ${frameX} ${frameY + frameHeight} L ${frameX} ${frameY + frameHeight - 20}`} fill="none" />
        {/* Bottom right */}
        <path d={`M ${frameX + frameWidth - 20} ${frameY + frameHeight} L ${frameX + frameWidth} ${frameY + frameHeight} L ${frameX + frameWidth} ${frameY + frameHeight - 20}`} fill="none" />
      </g>

      {/* Center crosshair */}
      {!isProfile && (
        <g stroke="rgba(255,255,255,0.3)" strokeWidth="1">
          <line
            x1={containerWidth / 2 - 10}
            y1={containerHeight / 2}
            x2={containerWidth / 2 + 10}
            y2={containerHeight / 2}
          />
          <line
            x1={containerWidth / 2}
            y1={containerHeight / 2 - 10}
            x2={containerWidth / 2}
            y2={containerHeight / 2 + 10}
          />
        </g>
      )}

      {/* Profile rotation indicator */}
      {isProfile && (
        <g>
          <path
            d={photoType === 'profile_left' 
              ? `M ${containerWidth * 0.7} ${containerHeight * 0.5} L ${containerWidth * 0.8} ${containerHeight * 0.5}`
              : `M ${containerWidth * 0.2} ${containerHeight * 0.5} L ${containerWidth * 0.3} ${containerHeight * 0.5}`
            }
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.6)" />
            </marker>
          </defs>
          <text
            x={photoType === 'profile_left' ? containerWidth * 0.85 : containerWidth * 0.15}
            y={containerHeight * 0.52}
            fill="rgba(255,255,255,0.7)"
            fontSize="11"
            textAnchor="middle"
          >
            90°
          </text>
        </g>
      )}
    </svg>
  );
}
