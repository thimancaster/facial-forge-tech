import { AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Limites seguros de dosagem por região muscular (em Unidades)
export const DOSAGE_LIMITS: Record<string, { max: number; warning: number; label: string }> = {
  procerus: { max: 15, warning: 12, label: "Prócero" },
  corrugator_left: { max: 12, warning: 10, label: "Corrugador Esquerdo" },
  corrugator_right: { max: 12, warning: 10, label: "Corrugador Direito" },
  frontalis: { max: 20, warning: 15, label: "Frontal" },
  orbicularis_oculi_left: { max: 15, warning: 12, label: "Orbicular Olho Esq." },
  orbicularis_oculi_right: { max: 15, warning: 12, label: "Orbicular Olho Dir." },
  nasalis: { max: 8, warning: 6, label: "Nasal" },
  levator_labii: { max: 5, warning: 4, label: "Levantador Lábio" },
  zygomaticus_major: { max: 6, warning: 5, label: "Zigomático Maior" },
  zygomaticus_minor: { max: 5, warning: 4, label: "Zigomático Menor" },
  orbicularis_oris: { max: 6, warning: 5, label: "Orbicular da Boca" },
  depressor_anguli: { max: 6, warning: 5, label: "Depressor do Ângulo" },
  mentalis: { max: 10, warning: 8, label: "Mentual" },
  masseter: { max: 60, warning: 50, label: "Masseter" },
};

// Limite total recomendado por sessão
export const TOTAL_SESSION_LIMIT = {
  max: 100,
  warning: 80,
};

interface DosagesByMuscle {
  [muscle: string]: number;
}

interface DosageSafetyAlertProps {
  dosagesByMuscle: DosagesByMuscle;
  totalDosage: number;
}

export type AlertLevel = "safe" | "warning" | "danger";

export interface SafetyCheck {
  level: AlertLevel;
  muscle: string;
  label: string;
  dosage: number;
  limit: number;
  message: string;
}

export function checkDosageSafety(dosagesByMuscle: DosagesByMuscle, totalDosage: number): SafetyCheck[] {
  const alerts: SafetyCheck[] = [];

  // Verificar cada músculo
  Object.entries(dosagesByMuscle).forEach(([muscle, dosage]) => {
    const limits = DOSAGE_LIMITS[muscle];
    if (!limits) return;

    if (dosage > limits.max) {
      alerts.push({
        level: "danger",
        muscle,
        label: limits.label,
        dosage,
        limit: limits.max,
        message: `${limits.label}: ${dosage}U excede o limite máximo de ${limits.max}U`,
      });
    } else if (dosage > limits.warning) {
      alerts.push({
        level: "warning",
        muscle,
        label: limits.label,
        dosage,
        limit: limits.max,
        message: `${limits.label}: ${dosage}U está próximo do limite (${limits.max}U)`,
      });
    }
  });

  // Verificar total da sessão
  if (totalDosage > TOTAL_SESSION_LIMIT.max) {
    alerts.push({
      level: "danger",
      muscle: "total",
      label: "Total da Sessão",
      dosage: totalDosage,
      limit: TOTAL_SESSION_LIMIT.max,
      message: `Dosagem total de ${totalDosage}U excede o limite recomendado de ${TOTAL_SESSION_LIMIT.max}U por sessão`,
    });
  } else if (totalDosage > TOTAL_SESSION_LIMIT.warning) {
    alerts.push({
      level: "warning",
      muscle: "total",
      label: "Total da Sessão",
      dosage: totalDosage,
      limit: TOTAL_SESSION_LIMIT.max,
      message: `Dosagem total de ${totalDosage}U está próxima do limite recomendado (${TOTAL_SESSION_LIMIT.max}U)`,
    });
  }

  return alerts;
}

export function DosageSafetyAlert({ dosagesByMuscle, totalDosage }: DosageSafetyAlertProps) {
  const alerts = checkDosageSafety(dosagesByMuscle, totalDosage);
  
  const dangerAlerts = alerts.filter((a) => a.level === "danger");
  const warningAlerts = alerts.filter((a) => a.level === "warning");

  if (alerts.length === 0) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700">Dosagem Segura</AlertTitle>
        <AlertDescription className="text-green-600/90">
          Todas as dosagens estão dentro dos limites recomendados.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {dangerAlerts.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Alerta de Segurança Crítico
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {dangerAlerts.map((alert, i) => (
                <li key={i} className="text-sm">
                  {alert.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warningAlerts.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Atenção</AlertTitle>
          <AlertDescription className="text-amber-600/90">
            <ul className="list-disc list-inside mt-2 space-y-1">
              {warningAlerts.map((alert, i) => (
                <li key={i} className="text-sm">
                  {alert.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
