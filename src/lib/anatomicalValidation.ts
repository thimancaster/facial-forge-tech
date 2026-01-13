import { InjectionPoint, SafetyZone } from "@/components/Face3DViewer";
import { getZoneFromMuscle } from "@/lib/muscleUtils";

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface ValidationWarning {
  type: "symmetry" | "hierarchy" | "proximity" | "dosage";
  message: string;
  affectedPoints: string[];
  severity: "low" | "medium" | "high";
}

export interface ValidationError {
  type: "danger_zone" | "limit_exceeded" | "invalid_position";
  message: string;
  affectedPoints: string[];
}

// Danger zone coordinates (normalized 0-100)
const DANGER_ZONES = [
  {
    id: "orbital_margin_left",
    label: "Margem Orbital Esquerda",
    bounds: { xMin: 25, xMax: 45, yMin: 28, yMax: 40 },
    reason: "Risco de ptose palpebral",
  },
  {
    id: "orbital_margin_right",
    label: "Margem Orbital Direita",
    bounds: { xMin: 55, xMax: 75, yMin: 28, yMax: 40 },
    reason: "Risco de ptose palpebral",
  },
  {
    id: "infraorbital_left",
    label: "Área Infraorbital Esquerda",
    bounds: { xMin: 25, xMax: 42, yMin: 42, yMax: 55 },
    reason: "Risco de difusão para músculos oculares",
  },
  {
    id: "infraorbital_right",
    label: "Área Infraorbital Direita",
    bounds: { xMin: 58, xMax: 75, yMin: 42, yMax: 55 },
    reason: "Risco de difusão para músculos oculares",
  },
  {
    id: "labial_commissure_left",
    label: "Comissura Labial Esquerda",
    bounds: { xMin: 30, xMax: 42, yMin: 60, yMax: 70 },
    reason: "Risco de assimetria do sorriso",
  },
  {
    id: "labial_commissure_right",
    label: "Comissura Labial Direita",
    bounds: { xMin: 58, xMax: 70, yMin: 60, yMax: 70 },
    reason: "Risco de assimetria do sorriso",
  },
];

// Spatial hierarchy rules (Y coordinates should follow this order)
const SPATIAL_HIERARCHY = [
  { zone: "frontalis", maxY: 25 },
  { zone: "glabella", minY: 28, maxY: 42 },
  { zone: "periorbital", minY: 35, maxY: 52 },
  { zone: "nasal", minY: 40, maxY: 55 },
  { zone: "perioral", minY: 55, maxY: 75 },
  { zone: "mentalis", minY: 70, maxY: 95 },
];

// Check bilateral symmetry
function checkSymmetry(points: InjectionPoint[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // Group points by side (left: x < 50, right: x > 50)
  const leftPoints = points.filter(p => p.x < 50);
  const rightPoints = points.filter(p => p.x > 50);
  
  // Compare matching muscle pairs
  const leftMuscles = new Map<string, InjectionPoint>();
  leftPoints.forEach(p => {
    const baseMuscleName = p.muscle.replace(/esquerdo|esq\.|left|dir\.|direito|right/gi, "").trim();
    leftMuscles.set(baseMuscleName.toLowerCase(), p);
  });
  
  rightPoints.forEach(rightPoint => {
    const baseMuscleName = rightPoint.muscle.replace(/esquerdo|esq\.|left|dir\.|direito|right/gi, "").trim().toLowerCase();
    const leftPoint = leftMuscles.get(baseMuscleName);
    
    if (leftPoint) {
      // Check if X coordinates are symmetric (should sum to ~100)
      const symmetrySum = leftPoint.x + rightPoint.x;
      const symmetryDeviation = Math.abs(symmetrySum - 100);
      
      if (symmetryDeviation > 10) {
        warnings.push({
          type: "symmetry",
          message: `Assimetria detectada: ${leftPoint.muscle} (x=${leftPoint.x}) e ${rightPoint.muscle} (x=${rightPoint.x}) não são simétricos`,
          affectedPoints: [leftPoint.id, rightPoint.id],
          severity: symmetryDeviation > 20 ? "high" : "medium",
        });
      }
      
      // Check if Y coordinates are similar
      const yDeviation = Math.abs(leftPoint.y - rightPoint.y);
      if (yDeviation > 5) {
        warnings.push({
          type: "symmetry",
          message: `Altura diferente: ${leftPoint.muscle} (y=${leftPoint.y}) e ${rightPoint.muscle} (y=${rightPoint.y})`,
          affectedPoints: [leftPoint.id, rightPoint.id],
          severity: yDeviation > 10 ? "high" : "medium",
        });
      }
      
      // Check if dosages are similar
      const dosageDeviation = Math.abs(leftPoint.dosage - rightPoint.dosage);
      if (dosageDeviation > 2) {
        warnings.push({
          type: "dosage",
          message: `Dosagem assimétrica: ${leftPoint.muscle} (${leftPoint.dosage}U) vs ${rightPoint.muscle} (${rightPoint.dosage}U)`,
          affectedPoints: [leftPoint.id, rightPoint.id],
          severity: dosageDeviation > 5 ? "high" : "low",
        });
      }
    }
  });
  
  return warnings;
}

// Check spatial hierarchy
function checkHierarchy(points: InjectionPoint[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  points.forEach(point => {
    const zone = getZoneFromMuscle(point.muscle);
    const hierarchyRule = SPATIAL_HIERARCHY.find(h => h.zone === zone);
    
    if (hierarchyRule) {
      if (hierarchyRule.maxY !== undefined && point.y > hierarchyRule.maxY) {
        warnings.push({
          type: "hierarchy",
          message: `${point.muscle} está muito baixo (y=${point.y}). Para ${zone}, máximo recomendado é y=${hierarchyRule.maxY}`,
          affectedPoints: [point.id],
          severity: "medium",
        });
      }
      if (hierarchyRule.minY !== undefined && point.y < hierarchyRule.minY) {
        warnings.push({
          type: "hierarchy",
          message: `${point.muscle} está muito alto (y=${point.y}). Para ${zone}, mínimo recomendado é y=${hierarchyRule.minY}`,
          affectedPoints: [point.id],
          severity: "medium",
        });
      }
    }
  });
  
  return warnings;
}

// Check if point is in danger zone
function checkDangerZones(points: InjectionPoint[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  points.forEach(point => {
    DANGER_ZONES.forEach(zone => {
      if (
        point.x >= zone.bounds.xMin &&
        point.x <= zone.bounds.xMax &&
        point.y >= zone.bounds.yMin &&
        point.y <= zone.bounds.yMax
      ) {
        errors.push({
          type: "danger_zone",
          message: `${point.muscle} está na ${zone.label}: ${zone.reason}`,
          affectedPoints: [point.id],
        });
      }
    });
  });
  
  return errors;
}

// Check point proximity (too close together = risk of overlap)
function checkProximity(points: InjectionPoint[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const minDistance = 5; // Minimum distance in percentage points
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      
      const distance = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      
      if (distance < minDistance) {
        warnings.push({
          type: "proximity",
          message: `Pontos muito próximos: ${p1.muscle} e ${p2.muscle} (distância: ${distance.toFixed(1)}%)`,
          affectedPoints: [p1.id, p2.id],
          severity: distance < 3 ? "high" : "medium",
        });
      }
    }
  }
  
  return warnings;
}

/**
 * Validate anatomical consistency of injection points
 */
export function validateAnatomicalConsistency(points: InjectionPoint[]): ValidationResult {
  if (!points || points.length === 0) {
    return { isValid: true, warnings: [], errors: [] };
  }
  
  const warnings: ValidationWarning[] = [
    ...checkSymmetry(points),
    ...checkHierarchy(points),
    ...checkProximity(points),
  ];
  
  const errors: ValidationError[] = [
    ...checkDangerZones(points),
  ];
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get a summary of the validation result
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return "✓ Todos os pontos estão em posições anatomicamente corretas";
  }
  
  const parts: string[] = [];
  
  if (result.errors.length > 0) {
    parts.push(`⚠️ ${result.errors.length} erro(s) crítico(s)`);
  }
  
  if (result.warnings.length > 0) {
    const highSeverity = result.warnings.filter(w => w.severity === "high").length;
    const mediumSeverity = result.warnings.filter(w => w.severity === "medium").length;
    
    if (highSeverity > 0) {
      parts.push(`${highSeverity} aviso(s) importante(s)`);
    }
    if (mediumSeverity > 0) {
      parts.push(`${mediumSeverity} sugestão(ões)`);
    }
  }
  
  return parts.join(" | ");
}
