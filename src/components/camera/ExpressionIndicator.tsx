import { useMemo } from "react";
import { Smile, Frown, Meh, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpressionResult, ExpressionType } from "@/hooks/useExpressionDetection";
import { PhotoType } from "@/components/CameraCapture";

interface ExpressionIndicatorProps {
  expressionResult: ExpressionResult;
  photoType: PhotoType;
  showDetails?: boolean;
}

/**
 * Visual icons for each expression type
 */
const EXPRESSION_ICONS: Record<ExpressionType, React.ElementType> = {
  neutral: Meh,
  frown: Frown,
  surprise: Sparkles,
  smile: Smile,
  bunny_lines: AlertCircle,
  pucker: AlertCircle,
  unknown: AlertCircle,
};

/**
 * Colors for expression states
 */
const EXPRESSION_COLORS = {
  correct: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    icon: 'text-green-400',
  },
  incorrect: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  unknown: {
    bg: 'bg-muted/50',
    border: 'border-muted',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

/**
 * Friendly names for expressions
 */
const EXPRESSION_NAMES: Record<ExpressionType, string> = {
  neutral: 'Neutra',
  frown: 'Franzida',
  surprise: 'Surpresa',
  smile: 'Sorriso',
  bunny_lines: 'Bunny Lines',
  pucker: 'Bico',
  unknown: 'Não detectada',
};

export function ExpressionIndicator({
  expressionResult,
  photoType,
  showDetails = false,
}: ExpressionIndicatorProps) {
  const { detectedExpression, expectedExpression, isCorrectExpression, confidence, feedback } = expressionResult;
  
  const colors = useMemo(() => {
    if (detectedExpression === 'unknown') return EXPRESSION_COLORS.unknown;
    return isCorrectExpression ? EXPRESSION_COLORS.correct : EXPRESSION_COLORS.incorrect;
  }, [detectedExpression, isCorrectExpression]);

  const DetectedIcon = EXPRESSION_ICONS[detectedExpression];
  const ExpectedIcon = EXPRESSION_ICONS[expectedExpression];

  return (
    <div className={cn(
      "rounded-lg border backdrop-blur-sm p-2",
      colors.bg,
      colors.border
    )}>
      {/* Main indicator */}
      <div className="flex items-center gap-2">
        {isCorrectExpression ? (
          <CheckCircle className={cn("w-5 h-5", colors.icon)} />
        ) : (
          <AlertCircle className={cn("w-5 h-5 animate-pulse", colors.icon)} />
        )}
        
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-medium truncate", colors.text)}>
            {feedback}
          </p>
          
          {showDetails && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/50">
                Detectado: {EXPRESSION_NAMES[detectedExpression]}
              </span>
              {!isCorrectExpression && (
                <span className="text-[10px] text-white/50">
                  • Esperado: {EXPRESSION_NAMES[expectedExpression]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Confidence indicator */}
        <div className="flex flex-col items-center">
          <DetectedIcon className={cn("w-4 h-4", colors.icon)} />
          <span className={cn("text-[9px] font-mono", colors.text)}>
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Metrics bar (optional) */}
      {showDetails && (
        <div className="mt-2 h-1.5 bg-black/30 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isCorrectExpression ? "bg-green-500" : "bg-amber-500"
            )}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for header display
 */
export function ExpressionIndicatorCompact({
  expressionResult,
}: {
  expressionResult: ExpressionResult;
}) {
  const { isCorrectExpression, confidence, detectedExpression } = expressionResult;
  const DetectedIcon = EXPRESSION_ICONS[detectedExpression];
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      isCorrectExpression 
        ? "bg-green-500/20 text-green-400 border border-green-500/30" 
        : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
    )}>
      <DetectedIcon className="w-3.5 h-3.5" />
      <span>{isCorrectExpression ? 'Expressão OK' : 'Ajuste expressão'}</span>
    </div>
  );
}
