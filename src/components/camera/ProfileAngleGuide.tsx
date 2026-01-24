import { cn } from "@/lib/utils";
import { RotateCcw, RotateCw, Check } from "lucide-react";
import { ProfileAngleResult } from "@/hooks/useDeviceOrientation";

interface ProfileAngleGuideProps {
  profileType: 'profile_left' | 'profile_right';
  angleResult: ProfileAngleResult | null;
  isSupported: boolean;
  containerWidth: number;
  containerHeight: number;
}

export function ProfileAngleGuide({
  profileType,
  angleResult,
  isSupported,
  containerWidth,
  containerHeight,
}: ProfileAngleGuideProps) {
  if (!isSupported) {
    return (
      <div className="absolute bottom-36 left-4 right-4 z-20">
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3 text-center">
          <p className="text-yellow-200 text-xs">
            Giroscópio não disponível — posicione manualmente a 90°
          </p>
        </div>
      </div>
    );
  }

  if (!angleResult) return null;

  const { isCorrectAngle, currentAngle, deviation, direction, message } = angleResult;

  // Calculate visual indicator position
  const indicatorAngle = Math.min(90, Math.max(-90, currentAngle));
  const normalizedPosition = (indicatorAngle + 90) / 180; // 0 to 1

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Profile silhouette guide */}
      <svg
        viewBox={`0 0 ${containerWidth} ${containerHeight}`}
        className="absolute inset-0"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>

        {/* Profile silhouette outline */}
        {profileType === 'profile_left' ? (
          <path
            d={`
              M ${containerWidth * 0.6} ${containerHeight * 0.2}
              Q ${containerWidth * 0.55} ${containerHeight * 0.25} ${containerWidth * 0.5} ${containerHeight * 0.3}
              Q ${containerWidth * 0.45} ${containerHeight * 0.35} ${containerWidth * 0.42} ${containerHeight * 0.4}
              L ${containerWidth * 0.38} ${containerHeight * 0.45}
              Q ${containerWidth * 0.35} ${containerHeight * 0.5} ${containerWidth * 0.38} ${containerHeight * 0.55}
              Q ${containerWidth * 0.4} ${containerHeight * 0.6} ${containerWidth * 0.42} ${containerHeight * 0.65}
              Q ${containerWidth * 0.45} ${containerHeight * 0.7} ${containerWidth * 0.5} ${containerHeight * 0.75}
              Q ${containerWidth * 0.55} ${containerHeight * 0.78} ${containerWidth * 0.6} ${containerHeight * 0.8}
            `}
            fill="none"
            stroke={isCorrectAngle ? 'rgba(34, 197, 94, 0.6)' : 'rgba(255, 255, 255, 0.3)'}
            strokeWidth="2"
            strokeDasharray="8 4"
          />
        ) : (
          <path
            d={`
              M ${containerWidth * 0.4} ${containerHeight * 0.2}
              Q ${containerWidth * 0.45} ${containerHeight * 0.25} ${containerWidth * 0.5} ${containerHeight * 0.3}
              Q ${containerWidth * 0.55} ${containerHeight * 0.35} ${containerWidth * 0.58} ${containerHeight * 0.4}
              L ${containerWidth * 0.62} ${containerHeight * 0.45}
              Q ${containerWidth * 0.65} ${containerHeight * 0.5} ${containerWidth * 0.62} ${containerHeight * 0.55}
              Q ${containerWidth * 0.6} ${containerHeight * 0.6} ${containerWidth * 0.58} ${containerHeight * 0.65}
              Q ${containerWidth * 0.55} ${containerHeight * 0.7} ${containerWidth * 0.5} ${containerHeight * 0.75}
              Q ${containerWidth * 0.45} ${containerHeight * 0.78} ${containerWidth * 0.4} ${containerHeight * 0.8}
            `}
            fill="none"
            stroke={isCorrectAngle ? 'rgba(34, 197, 94, 0.6)' : 'rgba(255, 255, 255, 0.3)'}
            strokeWidth="2"
            strokeDasharray="8 4"
          />
        )}

        {/* Nose-chin reference line */}
        <line
          x1={profileType === 'profile_left' ? containerWidth * 0.38 : containerWidth * 0.62}
          y1={containerHeight * 0.45}
          x2={profileType === 'profile_left' ? containerWidth * 0.42 : containerWidth * 0.58}
          y2={containerHeight * 0.7}
          stroke={isCorrectAngle ? 'rgba(34, 197, 94, 0.8)' : 'rgba(249, 115, 22, 0.6)'}
          strokeWidth="2"
          strokeDasharray="6 3"
        />
      </svg>

      {/* Angle indicator bar */}
      <div className="absolute bottom-40 left-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-xs font-medium">Ângulo de Rotação</span>
            <span className={cn(
              "text-xs font-bold",
              isCorrectAngle ? "text-green-400" : "text-yellow-400"
            )}>
              {Math.round(Math.abs(currentAngle))}°
            </span>
          </div>

          {/* Visual angle bar */}
          <div className="relative h-8 bg-white/10 rounded-full overflow-hidden">
            {/* Target zone */}
            <div 
              className="absolute top-0 bottom-0 bg-green-500/30 rounded-full"
              style={{
                left: profileType === 'profile_left' ? '70%' : '15%',
                width: '15%',
              }}
            />

            {/* Current position indicator */}
            <div 
              className={cn(
                "absolute top-1 bottom-1 w-3 rounded-full transition-all duration-150",
                isCorrectAngle ? "bg-green-500" : "bg-yellow-500"
              )}
              style={{
                left: `calc(${normalizedPosition * 100}% - 6px)`,
              }}
            />

            {/* Scale markers */}
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <span className="text-white/40 text-[10px]">-90°</span>
              <span className="text-white/40 text-[10px]">0°</span>
              <span className="text-white/40 text-[10px]">+90°</span>
            </div>
          </div>

          {/* Direction feedback */}
          <div className={cn(
            "mt-2 flex items-center justify-center gap-2 py-1.5 rounded",
            isCorrectAngle 
              ? "bg-green-500/20 text-green-300" 
              : "bg-yellow-500/20 text-yellow-300"
          )}>
            {isCorrectAngle ? (
              <Check className="w-4 h-4" />
            ) : direction === 'left' ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <RotateCw className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
