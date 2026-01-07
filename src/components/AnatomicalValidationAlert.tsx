import { useMemo } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { validateAnatomicalConsistency, ValidationResult, ValidationWarning, ValidationError } from "@/lib/anatomicalValidation";
import { InjectionPoint } from "@/components/Face3DViewer";
import { useState } from "react";

interface AnatomicalValidationAlertProps {
  injectionPoints: InjectionPoint[];
  onHighlightPoints?: (pointIds: string[]) => void;
}

export function AnatomicalValidationAlert({ injectionPoints, onHighlightPoints }: AnatomicalValidationAlertProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const validationResult = useMemo(() => {
    return validateAnatomicalConsistency(injectionPoints);
  }, [injectionPoints]);

  const { isValid, warnings, errors } = validationResult;

  const highSeverityWarnings = warnings.filter(w => w.severity === "high");
  const mediumSeverityWarnings = warnings.filter(w => w.severity === "medium");
  const lowSeverityWarnings = warnings.filter(w => w.severity === "low");

  // If everything is valid with no warnings
  if (isValid && warnings.length === 0) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700">Validação Anatômica OK</AlertTitle>
        <AlertDescription className="text-green-600">
          Todos os pontos estão em posições anatomicamente corretas e simétricas.
        </AlertDescription>
      </Alert>
    );
  }

  const getWarningIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case "medium":
        return <AlertCircle className="h-3 w-3 text-amber-500" />;
      default:
        return <Info className="h-3 w-3 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Alta</Badge>;
      case "medium":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600">Média</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Baixa</Badge>;
    }
  };

  const renderWarning = (warning: ValidationWarning, index: number) => (
    <div 
      key={`warning-${index}`}
      className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
      onClick={() => onHighlightPoints?.(warning.affectedPoints)}
    >
      {getWarningIcon(warning.severity)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium capitalize">{warning.type}</span>
          {getSeverityBadge(warning.severity)}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{warning.message}</p>
      </div>
    </div>
  );

  const renderError = (error: ValidationError, index: number) => (
    <div 
      key={`error-${index}`}
      className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 cursor-pointer transition-colors hover:bg-red-500/20"
      onClick={() => onHighlightPoints?.(error.affectedPoints)}
    >
      <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-red-700 capitalize">{error.type.replace(/_/g, ' ')}</span>
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Crítico</Badge>
        </div>
        <p className="text-xs text-red-600 mt-0.5">{error.message}</p>
      </div>
    </div>
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Alert className={`${errors.length > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {errors.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <AlertTitle className={`${errors.length > 0 ? 'text-red-700' : 'text-amber-700'} m-0`}>
                Validação Anatômica
              </AlertTitle>
              <div className="flex gap-1.5 ml-2">
                {errors.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{errors.length} erro(s)</Badge>
                )}
                {highSeverityWarnings.length > 0 && (
                  <Badge variant="outline" className="text-xs border-red-400 text-red-600">{highSeverityWarnings.length} alerta(s)</Badge>
                )}
                {mediumSeverityWarnings.length > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">{mediumSeverityWarnings.length} aviso(s)</Badge>
                )}
                {lowSeverityWarnings.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{lowSeverityWarnings.length} info</Badge>
                )}
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <AlertDescription className="mt-3 space-y-3">
            {/* Errors Section */}
            {errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Erros Críticos</p>
                {errors.map(renderError)}
              </div>
            )}

            {/* High Severity Warnings */}
            {highSeverityWarnings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Alertas Importantes</p>
                {highSeverityWarnings.map(renderWarning)}
              </div>
            )}

            {/* Medium Severity Warnings */}
            {mediumSeverityWarnings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Avisos</p>
                {mediumSeverityWarnings.map(renderWarning)}
              </div>
            )}

            {/* Low Severity Warnings */}
            {lowSeverityWarnings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sugestões</p>
                {lowSeverityWarnings.map(renderWarning)}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
              💡 Clique em um item para destacar os pontos afetados no modelo 3D
            </p>
          </AlertDescription>
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  );
}
