/**
 * Shared muscle and anatomical zone utilities
 * Used by Face3DViewer, DashboardAnalytics, and anatomicalValidation
 */

export type AnatomicalZone = 
  | 'glabella' 
  | 'frontalis' 
  | 'periorbital' 
  | 'nasal' 
  | 'perioral' 
  | 'mentalis' 
  | 'masseter'
  | 'unknown';

/**
 * Maps a muscle name to its corresponding facial zone
 */
export function getZoneFromMuscle(muscle: string): AnatomicalZone {
  const muscleLower = muscle.toLowerCase();
  
  if (muscleLower.includes('procerus') || muscleLower.includes('prócero') || muscleLower.includes('corrugador') || muscleLower.includes('corrugator')) {
    return 'glabella';
  }
  if (muscleLower.includes('frontal') || muscleLower.includes('frontalis')) {
    return 'frontalis';
  }
  if (muscleLower.includes('orbicular') && (muscleLower.includes('olho') || muscleLower.includes('oculi'))) {
    return 'periorbital';
  }
  if (muscleLower.includes('nasal') || muscleLower.includes('nasalis')) {
    return 'nasal';
  }
  if (muscleLower.includes('oris') || muscleLower.includes('boca') || muscleLower.includes('depressor') || muscleLower.includes('labial')) {
    return 'perioral';
  }
  if (muscleLower.includes('mentalis') || muscleLower.includes('mentual') || muscleLower.includes('queixo')) {
    return 'mentalis';
  }
  if (muscleLower.includes('masseter')) {
    return 'masseter';
  }
  return 'unknown';
}

/**
 * Checks if a muscle belongs to a specific region
 */
export function muscleMatchesRegion(muscle: string, region: string): boolean {
  const muscleLower = muscle.toLowerCase();
  
  switch (region) {
    case 'glabela':
    case 'glabella':
      return muscleLower.includes('procerus') || muscleLower.includes('corrugator') || muscleLower.includes('prócero') || muscleLower.includes('corrugador');
    case 'frontal':
    case 'frontalis':
      return muscleLower.includes('frontal');
    case 'periorbital':
      return muscleLower.includes('orbicular') && (muscleLower.includes('oculi') || muscleLower.includes('olho'));
    case 'nasal':
      return muscleLower.includes('nasal');
    case 'perioral':
      return muscleLower.includes('oris') || muscleLower.includes('depressor') || muscleLower.includes('labial');
    case 'mentual':
    case 'mentalis':
      return muscleLower.includes('mentalis') || muscleLower.includes('mentual');
    default:
      return true;
  }
}

/**
 * Labels for muscle display in UI
 */
export const MUSCLE_LABELS: Record<string, string> = {
  procerus: 'Prócero',
  corrugator_left: 'Corrugador Esq.',
  corrugator_right: 'Corrugador Dir.',
  corrugator: 'Corrugadores',
  frontalis: 'Frontal',
  orbicularis_oculi_left: 'Orbicular Esq.',
  orbicularis_oculi_right: 'Orbicular Dir.',
  orbicularis_oculi: 'Orbicular Olhos',
  nasalis: 'Nasal',
  mentalis: 'Mentual',
  masseter: 'Masseter',
  depressor_anguli: 'Depressor do Ângulo',
  orbicularis_oris: 'Orbicular da Boca',
  levator_labii: 'Levantador do Lábio',
  zygomaticus_major: 'Zigomático Maior',
  zygomaticus_minor: 'Zigomático Menor',
};

/**
 * Regions grouping muscles for analytics and PDF export
 */
export const MUSCLE_REGIONS: Record<string, string[]> = {
  "Glabelar": ["procerus", "corrugator_left", "corrugator_right", "corrugator"],
  "Frontal": ["frontalis"],
  "Periorbital": ["orbicularis_oculi_left", "orbicularis_oculi_right", "orbicularis_oculi"],
  "Nasal": ["nasalis"],
  "Perioral": ["orbicularis_oris", "levator_labii", "depressor_anguli", "zygomaticus_major", "zygomaticus_minor"],
  "Terço Inferior": ["mentalis", "masseter"],
};

/**
 * Gets the display label for a muscle
 */
export function getMuscleLabel(muscle: string): string {
  const baseMuscle = muscle.replace(/_left|_right|_esq|_dir/gi, '');
  return MUSCLE_LABELS[baseMuscle] || MUSCLE_LABELS[muscle] || muscle;
}

/**
 * Determines region from muscle name for filtering
 */
export function getRegionFromMuscle(muscle: string): string {
  const muscleLower = muscle.toLowerCase();
  
  if (muscleLower.includes('procerus') || muscleLower.includes('corrugator')) {
    return 'glabela';
  }
  if (muscleLower.includes('frontal')) {
    return 'frontal';
  }
  if (muscleLower.includes('orbicular') && (muscleLower.includes('oculi') || muscleLower.includes('olho'))) {
    return 'periorbital';
  }
  if (muscleLower.includes('nasal')) {
    return 'nasal';
  }
  if (muscleLower.includes('oris') || muscleLower.includes('depressor') || muscleLower.includes('labial') || muscleLower.includes('zygom')) {
    return 'perioral';
  }
  if (muscleLower.includes('mentalis') || muscleLower.includes('mentual') || muscleLower.includes('masseter')) {
    return 'mentual';
  }
  return 'unknown';
}
