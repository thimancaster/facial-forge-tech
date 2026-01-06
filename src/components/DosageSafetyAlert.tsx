import { AlertTriangle, Shield, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Limites seguros de dosagem por região muscular (em Unidades) - Atualizado conforme Consenso Brasileiro 2024
export const DOSAGE_LIMITS: Record<string, { 
  max: number; 
  warning: number; 
  label: string;
  femaleRange: [number, number];
  maleRange: [number, number];
  muscleStrengthModifier: { low: number; medium: number; high: number };
}> = {
  procerus: { 
    max: 12, warning: 10, label: "Prócero",
    femaleRange: [4, 8], maleRange: [6, 12],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.2 }
  },
  corrugator_left: { 
    max: 15, warning: 12, label: "Corrugador Esquerdo",
    femaleRange: [6, 10], maleRange: [8, 15],
    muscleStrengthModifier: { low: 0.75, medium: 1.0, high: 1.25 }
  },
  corrugator_right: { 
    max: 15, warning: 12, label: "Corrugador Direito",
    femaleRange: [6, 10], maleRange: [8, 15],
    muscleStrengthModifier: { low: 0.75, medium: 1.0, high: 1.25 }
  },
  frontalis: { 
    max: 20, warning: 15, label: "Frontal",
    femaleRange: [8, 15], maleRange: [12, 20],
    muscleStrengthModifier: { low: 0.85, medium: 1.0, high: 1.15 }
  },
  orbicularis_oculi_left: { 
    max: 16, warning: 12, label: "Orbicular Olho Esq.",
    femaleRange: [6, 12], maleRange: [8, 16],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.2 }
  },
  orbicularis_oculi_right: { 
    max: 16, warning: 12, label: "Orbicular Olho Dir.",
    femaleRange: [6, 12], maleRange: [8, 16],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.2 }
  },
  nasalis: { 
    max: 6, warning: 5, label: "Nasal",
    femaleRange: [2, 4], maleRange: [4, 6],
    muscleStrengthModifier: { low: 0.9, medium: 1.0, high: 1.1 }
  },
  levator_labii: { 
    max: 5, warning: 4, label: "Levantador Lábio",
    femaleRange: [2, 4], maleRange: [3, 5],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.15 }
  },
  zygomaticus_major: { 
    max: 6, warning: 5, label: "Zigomático Maior",
    femaleRange: [2, 4], maleRange: [3, 6],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.15 }
  },
  zygomaticus_minor: { 
    max: 5, warning: 4, label: "Zigomático Menor",
    femaleRange: [2, 3], maleRange: [2, 5],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.15 }
  },
  orbicularis_oris: { 
    max: 6, warning: 5, label: "Orbicular da Boca",
    femaleRange: [2, 4], maleRange: [3, 6],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.15 }
  },
  depressor_anguli: { 
    max: 6, warning: 5, label: "Depressor do Ângulo",
    femaleRange: [2, 4], maleRange: [3, 6],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.15 }
  },
  mentalis: { 
    max: 12, warning: 10, label: "Mentual",
    femaleRange: [4, 8], maleRange: [6, 12],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.2 }
  },
  masseter: { 
    max: 60, warning: 50, label: "Masseter",
    femaleRange: [25, 40], maleRange: [35, 60],
    muscleStrengthModifier: { low: 0.8, medium: 1.0, high: 1.2 }
  },
};

// Limite total recomendado por sessão (terço superior apenas)
export const TOTAL_SESSION_LIMIT = {
  max: 100,
  warning: 80,
  upperThirdMax: 60,
  upperThirdWarning: 50,
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
