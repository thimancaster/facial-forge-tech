import { useMemo } from "react";
import { GitCompare, CheckCircle, AlertCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { LandmarkConsistencyResult } from "@/hooks/useLandmarkConsistency";
import { Progress } from "@/components/ui/progress";

interface ConsistencyIndicatorProps {
  consistencyResult: LandmarkConsistencyResult;
  showDetails?: boolean;
  hasReference: boolean;
}

export function ConsistencyIndicator({
  consistencyResult,
  showDetails = false,
  hasReference,
}: ConsistencyIndicatorProps) {
  const { isConsistent, overallScore, positionScore, scaleScore, rotationScore, feedback, deviations } = consistencyResult;

  const colors = useMemo(() => {
    if (!hasReference) return { bg: 'bg-muted/50', border: 'border-muted', text: 'text-muted-foreground' };
    if (isConsistent) return { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' };
    if (overallScore >= 50) return { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' };
    return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' };
  }, [hasReference, isConsistent, overallScore]);

  // Get direction arrows for deviation feedback
  const getDeviationIcon = () => {
    const { horizontalOffset, verticalOffset, scaleRatio } = deviations;
    
    if (Math.abs(horizontalOffset) > 0.05) {
      return horizontalOffset > 0 ? ArrowLeft : ArrowRight;
    }
    if (Math.abs(verticalOffset) > 0.05) {
      return verticalOffset > 0 ? ArrowUp : ArrowDown;
    }
    if (Math.abs(1 - scaleRatio) > 0.1) {
      return scaleRatio < 1 ? ZoomIn : ZoomOut;
    }
    if (Math.abs(deviations.rollAngle) > 3) {
      return RotateCcw;
    }
    return CheckCircle;
  };

  const DeviationIcon = getDeviationIcon();

  if (!hasReference) {
    return (
      <div className={cn(
        "rounded-lg border backdrop-blur-sm p-2",
        colors.bg,
        colors.border
      )}>
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Primeira sessão — sem referência para comparar
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border backdrop-blur-sm p-2",
      colors.bg,
      colors.border
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isConsistent ? (
            <CheckCircle className={cn("w-4 h-4 shrink-0", colors.text)} />
          ) : (
            <DeviationIcon className={cn("w-4 h-4 shrink-0 animate-pulse", colors.text)} />
          )}
          <div className="min-w-0">
            <p className={cn("text-xs font-medium truncate", colors.text)}>
              {feedback[0]}
            </p>
          </div>
        </div>

        {/* Overall score badge */}
        <div className={cn(
          "px-2 py-0.5 rounded text-xs font-bold shrink-0",
          isConsistent ? "bg-green-500/30 text-green-400" : "bg-amber-500/30 text-amber-400"
        )}>
          {overallScore}%
        </div>
      </div>

      {/* Detailed metrics */}
      {showDetails && (
        <div className="mt-2 space-y-1.5">
          {/* Position */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50 w-16">Posição</span>
            <Progress value={positionScore} className="flex-1 h-1.5" />
            <span className="text-[10px] text-white/70 w-8 text-right">{positionScore}%</span>
          </div>
          
          {/* Scale */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50 w-16">Escala</span>
            <Progress value={scaleScore} className="flex-1 h-1.5" />
            <span className="text-[10px] text-white/70 w-8 text-right">{scaleScore}%</span>
          </div>
          
          {/* Rotation */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50 w-16">Rotação</span>
            <Progress value={rotationScore} className="flex-1 h-1.5" />
            <span className="text-[10px] text-white/70 w-8 text-right">{rotationScore}%</span>
          </div>

          {/* Additional feedback */}
          {feedback.length > 1 && (
            <div className="mt-1 pt-1 border-t border-white/10">
              {feedback.slice(1).map((msg, i) => (
                <p key={i} className="text-[10px] text-white/60">• {msg}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for header display
 */
export function ConsistencyIndicatorCompact({
  consistencyResult,
  hasReference,
}: {
  consistencyResult: LandmarkConsistencyResult;
  hasReference: boolean;
}) {
  const { isConsistent, overallScore } = consistencyResult;

  if (!hasReference) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-muted/30">
        <GitCompare className="w-3.5 h-3.5" />
        <span>1ª sessão</span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      isConsistent 
        ? "bg-green-500/20 text-green-400 border border-green-500/30" 
        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
    )}>
      <GitCompare className="w-3.5 h-3.5" />
      <span>{overallScore}% match</span>
    </div>
  );
}
