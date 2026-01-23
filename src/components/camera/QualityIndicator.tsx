import { FaceQuality } from "@/hooks/useFaceDetection";
import { Check, X, AlertTriangle, Sun, Move, ZoomIn, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface QualityIndicatorProps {
  quality: FaceQuality;
  showDetails?: boolean;
}

const QUALITY_CHECKS = [
  { key: 'isCentered', label: 'Centralizado', icon: Move },
  { key: 'isCorrectDistance', label: 'Distância', icon: ZoomIn },
  { key: 'isWellLit', label: 'Iluminação', icon: Sun },
  { key: 'isFacingCamera', label: 'Posição', icon: RotateCcw },
] as const;

export function QualityIndicator({ quality, showDetails = true }: QualityIndicatorProps) {
  const getScoreColor = () => {
    if (quality.overallScore >= 75) return 'text-green-500';
    if (quality.overallScore >= 50) return 'text-yellow-500';
    if (quality.overallScore >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColor = () => {
    if (quality.overallScore >= 75) return 'bg-green-500';
    if (quality.overallScore >= 50) return 'bg-yellow-500';
    if (quality.overallScore >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreLabel = () => {
    if (quality.overallScore >= 75) return 'Excelente';
    if (quality.overallScore >= 50) return 'Bom';
    if (quality.overallScore >= 25) return 'Regular';
    return 'Ajuste necessário';
  };

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 space-y-2">
      {/* Score bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
                getProgressColor()
              )}
              style={{ width: `${quality.overallScore}%` }}
            />
          </div>
        </div>
        <span className={cn("text-sm font-medium min-w-[80px] text-right", getScoreColor())}>
          {getScoreLabel()}
        </span>
      </div>

      {/* Quality checks */}
      {showDetails && (
        <div className="grid grid-cols-4 gap-1">
          {QUALITY_CHECKS.map(({ key, label, icon: Icon }) => {
            const passed = quality[key as keyof FaceQuality] as boolean;
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-1 rounded transition-colors",
                  passed ? "text-green-400" : "text-red-400/70"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  passed ? "bg-green-500/20" : "bg-red-500/20"
                )}>
                  {passed ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-[9px] text-center leading-tight">{label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Current issue feedback */}
      {quality.issues.length > 0 && (
        <div className={cn(
          "text-center py-1.5 px-2 rounded text-xs font-medium",
          quality.overallScore >= 75 
            ? "bg-green-500/20 text-green-300" 
            : "bg-yellow-500/20 text-yellow-300"
        )}>
          {quality.issues[0]}
        </div>
      )}
    </div>
  );
}

// Compact version for smaller screens
export function QualityIndicatorCompact({ quality }: { quality: FaceQuality }) {
  const getColor = () => {
    if (quality.overallScore >= 75) return 'bg-green-500';
    if (quality.overallScore >= 50) return 'bg-yellow-500';
    if (quality.overallScore >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
      <div className={cn("w-2 h-2 rounded-full animate-pulse", getColor())} />
      <span className="text-white/90 text-xs font-medium">
        {quality.issues[0]}
      </span>
    </div>
  );
}
