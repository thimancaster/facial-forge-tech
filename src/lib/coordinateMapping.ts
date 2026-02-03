/**
 * Unified Coordinate Mapping System
 * 
 * Sistema de coordenadas unificado para garantir alinhamento preciso entre:
 * - Coordenadas da IA (0-1 relativo à bounding box da face)
 * - Visualização 2D (PhotoPointsOverlay)
 * - Visualização 3D (Face3DViewer com modelo GLB)
 * 
 * Baseado em:
 * - Consenso Brasileiro 2024
 * - Carruthers & Carruthers
 * - Sebastian Cotofana (anatomia)
 */

import type { AnatomicalZone } from './muscleUtils';
import { getZoneFromMuscle } from './muscleUtils';

// ============ ANATOMICAL LANDMARKS (NORMALIZED 0-1) ============
// Referências anatômicas fundamentais para calibração
// Estes valores são baseados em proporções faciais padronizadas

export const FACIAL_LANDMARKS = {
  // Linha do cabelo / topo da testa
  hairline: { y: 0.0 },
  
  // Glabela / Nasion (entre as sobrancelhas)
  glabella: { x: 0.50, y: 0.36 },
  
  // Pupilas (linhas mediopupilares)
  pupilLeft: { x: 0.35, y: 0.38 },
  pupilRight: { x: 0.65, y: 0.38 },
  
  // Sobrancelhas
  browLeft: { xInner: 0.38, xOuter: 0.25, y: 0.32 },
  browRight: { xInner: 0.62, xOuter: 0.75, y: 0.32 },
  
  // Margem orbital superior (DANGER ZONE)
  orbitalMargin: { y: 0.34 },
  
  // Canto lateral dos olhos
  cantusLeft: { x: 0.22, y: 0.40 },
  cantusRight: { x: 0.78, y: 0.40 },
  
  // Ponta do nariz
  nasalTip: { x: 0.50, y: 0.55 },
  
  // Asa do nariz (alae)
  nasalAlaLeft: { x: 0.42, y: 0.53 },
  nasalAlaRight: { x: 0.58, y: 0.53 },
  
  // Comissura labial
  labialCommissureLeft: { x: 0.40, y: 0.68 },
  labialCommissureRight: { x: 0.60, y: 0.68 },
  
  // Centro do lábio superior
  upperLipCenter: { x: 0.50, y: 0.65 },
  
  // Centro do queixo
  chinCenter: { x: 0.50, y: 0.92 },
  
  // Masseter (ângulo mandibular)
  masseterLeft: { x: 0.18, y: 0.72 },
  masseterRight: { x: 0.82, y: 0.72 },
};

// ============ ZONE BOUNDARIES (NORMALIZED 0-1) ============
// Limites de cada zona anatômica em coordenadas normalizadas
// CALIBRADO para corresponder às coordenadas da IA (analyze-face)
// A IA usa: y=0.36 para glabela, y=0.11-0.20 para frontal, etc.

export const ZONE_BOUNDARIES: Record<AnatomicalZone, {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  centerX: number;
  centerY: number;
}> = {
  // GLABELA: Complexo glabelar (procerus + corrugadores)
  // IA coords típicas: x=0.36-0.64, y=0.30-0.40
  glabella: {
    xMin: 0.32,
    xMax: 0.68,
    yMin: 0.28,
    yMax: 0.42,
    centerX: 0.50,
    centerY: 0.36,
  },
  // FRONTAL: Testa superior
  // IA coords típicas: x=0.35-0.65, y=0.10-0.25
  // REGRA CRÍTICA: mínimo 2cm acima da sobrancelha
  frontalis: {
    xMin: 0.25,
    xMax: 0.75,
    yMin: 0.05,
    yMax: 0.28,
    centerX: 0.50,
    centerY: 0.16,
  },
  // PERIORBITAL: Lateral aos olhos (pés de galinha)
  // IA coords típicas: x=0.20-0.30 (esq) ou 0.70-0.80 (dir), y=0.36-0.48
  periorbital: {
    xMin: 0.15,
    xMax: 0.32,  // Left side (mirrored for right)
    yMin: 0.34,
    yMax: 0.52,
    centerX: 0.23,  // Left side (0.77 for right)
    centerY: 0.42,
  },
  // NASAL: Bunny lines
  // IA coords típicas: x=0.42-0.58, y=0.42-0.50
  nasal: {
    xMin: 0.40,
    xMax: 0.60,
    yMin: 0.42,
    yMax: 0.56,
    centerX: 0.50,
    centerY: 0.48,
  },
  // PERIORAL: Ao redor da boca
  // IA coords típicas: x=0.35-0.65, y=0.60-0.75
  perioral: {
    xMin: 0.35,
    xMax: 0.65,
    yMin: 0.58,
    yMax: 0.75,
    centerX: 0.50,
    centerY: 0.67,
  },
  // MENTALIS: Queixo
  // IA coords típicas: x=0.40-0.60, y=0.78-0.92
  mentalis: {
    xMin: 0.40,
    xMax: 0.60,
    yMin: 0.78,
    yMax: 0.95,
    centerX: 0.50,
    centerY: 0.88,
  },
  // MASSETER: Lateral da mandíbula
  // IA coords típicas: x=0.10-0.25 (esq) ou 0.75-0.90 (dir), y=0.55-0.80
  masseter: {
    xMin: 0.08,
    xMax: 0.28,  // Left side (mirrored for right)
    yMin: 0.55,
    yMax: 0.80,
    centerX: 0.18,  // Left side (0.82 for right)
    centerY: 0.68,
  },
  unknown: {
    xMin: 0.0,
    xMax: 1.0,
    yMin: 0.0,
    yMax: 1.0,
    centerX: 0.50,
    centerY: 0.50,
  },
};

// ============ 3D MODEL CALIBRATION (GLB SCALE 2.5) ============
// Mapeamento preciso das coordenadas 2D para o modelo GLB

const GLB_MODEL_PARAMS = {
  // Modelo GLB está em escala 2.5
  scale: 2.5,
  
  // Dimensões efetivas do modelo (após escala)
  // X: -1.2 a +1.2 (largura facial)
  // Y: -1.0 a +1.6 (altura: queixo a testa)
  // Z: 0.5 a 2.0 (profundidade: orelha a nariz)
  bounds: {
    xMin: -1.2,
    xMax: 1.2,
    yMin: -1.0,
    yMax: 1.6,
    zMin: 0.5,
    zMax: 2.0,
  },
  
  // Centro vertical da face (aproximadamente no nariz)
  centerY: 0.2,
  
  // Z de referência central (superfície frontal)
  centerZ: 1.8,
};

// ============ ZONE-SPECIFIC 3D ANCHORS ============
// Pontos de referência 3D para cada zona anatômica
// Calibrados ao modelo GLB em escala 2.5

const ZONE_3D_ANCHORS: Record<AnatomicalZone, {
  // Posição de referência no modelo 3D
  ref3D: { x: number; y: number; z: number };
  // Dimensões da zona no espaço 3D
  width3D: number;
  height3D: number;
  // Curvatura da superfície (maior = mais curvo)
  curvatureX: number;
  curvatureY: number;
  // Offset para garantir que pontos fiquem NA superfície
  surfaceOffset: number;
}> = {
  // GLABELA: Entre as sobrancelhas
  glabella: {
    ref3D: { x: 0, y: 0.72, z: 1.78 },
    width3D: 0.72,
    height3D: 0.50,
    curvatureX: 0.08,
    curvatureY: 0.04,
    surfaceOffset: 0.03,
  },
  
  // FRONTAL: Testa superior
  frontalis: {
    ref3D: { x: 0, y: 1.35, z: 1.35 },
    width3D: 1.40,
    height3D: 0.70,
    curvatureX: 0.25,
    curvatureY: 0.18,
    surfaceOffset: 0.04,
  },
  
  // PERIORBITAL: Lateral aos olhos (pés de galinha)
  periorbital: {
    ref3D: { x: 0.85, y: 0.48, z: 1.38 },
    width3D: 0.55,
    height3D: 0.50,
    curvatureX: 0.35,
    curvatureY: 0.08,
    surfaceOffset: 0.03,
  },
  
  // NASAL: Bunny lines
  nasal: {
    ref3D: { x: 0, y: 0.15, z: 1.95 },
    width3D: 0.35,
    height3D: 0.50,
    curvatureX: 0.12,
    curvatureY: 0.10,
    surfaceOffset: 0.02,
  },
  
  // PERIORAL: Ao redor da boca
  perioral: {
    ref3D: { x: 0, y: -0.42, z: 1.72 },
    width3D: 0.75,
    height3D: 0.45,
    curvatureX: 0.14,
    curvatureY: 0.06,
    surfaceOffset: 0.03,
  },
  
  // MENTALIS: Queixo
  mentalis: {
    ref3D: { x: 0, y: -0.88, z: 1.55 },
    width3D: 0.50,
    height3D: 0.35,
    curvatureX: 0.18,
    curvatureY: 0.22,
    surfaceOffset: 0.03,
  },
  
  // MASSETER: Lateral da mandíbula
  masseter: {
    ref3D: { x: 1.02, y: -0.30, z: 0.85 },
    width3D: 0.60,
    height3D: 0.70,
    curvatureX: 0.40,
    curvatureY: 0.10,
    surfaceOffset: 0.04,
  },
  
  // FALLBACK
  unknown: {
    ref3D: { x: 0, y: 0.30, z: 1.65 },
    width3D: 1.0,
    height3D: 1.0,
    curvatureX: 0.20,
    curvatureY: 0.15,
    surfaceOffset: 0.03,
  },
};

// ============ CONVERSION FUNCTIONS ============

/**
 * Converte coordenadas da IA (0-1) para porcentagem (0-100)
 * Usada pelo PhotoPointsOverlay
 */
export function aiToPercent(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(x * 100),
    y: Math.round(y * 100),
  };
}

/**
 * Converte porcentagem (0-100) para coordenadas da IA (0-1)
 */
export function percentToAI(x: number, y: number): { x: number; y: number } {
  return {
    x: x / 100,
    y: y / 100,
  };
}

/**
 * Converte coordenadas 2D (0-100%) para posição 3D no modelo GLB
 * 
 * ALGORITMO:
 * 1. Determina a zona anatômica a partir do músculo
 * 2. Converte porcentagem para offset normalizado do centro da zona
 * 3. Aplica dimensões da zona para obter offset 3D
 * 4. Trata zonas bilaterais (periorbital, masseter) espelhando para lado esquerdo
 * 5. Aplica curvatura da superfície para Z
 * 6. Adiciona offset de superfície
 */
export function percentTo3D(
  x: number, 
  y: number, 
  muscle: string
): [number, number, number] {
  const zone = getZoneFromMuscle(muscle);
  const anchor = ZONE_3D_ANCHORS[zone];
  const bounds = ZONE_BOUNDARIES[zone];
  
  // Calcular offset normalizado do centro da zona
  // Mapeia a posição relativa dentro da zona
  let normalizedX: number;
  let normalizedY: number;
  
  if (zone === 'periorbital' || zone === 'masseter') {
    // Zonas bilaterais: calcular posição relativa ao centro de cada lado
    const isLeftSide = x < 50;
    const sideCenter = isLeftSide ? bounds.centerX : (1 - bounds.centerX);
    normalizedX = ((x / 100) - sideCenter) * 2;
    normalizedY = ((y / 100) - bounds.centerY) * 2;
  } else {
    // Zonas centrais: calcular relativo ao centro
    normalizedX = ((x / 100) - bounds.centerX) * 2;
    normalizedY = ((y / 100) - bounds.centerY) * 2;
  }
  
  // Limitar offsets para evitar pontos fora da zona
  normalizedX = Math.max(-1, Math.min(1, normalizedX));
  normalizedY = Math.max(-1, Math.min(1, normalizedY));
  
  // Calcular posição X no modelo 3D
  let x3D: number;
  if (zone === 'periorbital' || zone === 'masseter') {
    const isLeftSide = x < 50;
    if (isLeftSide) {
      // Lado esquerdo: espelhar referência para X negativo
      x3D = -anchor.ref3D.x + (normalizedX * anchor.width3D / 2);
    } else {
      // Lado direito: usar referência positiva
      x3D = anchor.ref3D.x + (normalizedX * anchor.width3D / 2);
    }
  } else {
    // Zonas centrais
    x3D = anchor.ref3D.x + (normalizedX * anchor.width3D / 2);
  }
  
  // Calcular posição Y no modelo 3D
  // Inverter porque Y aumenta para baixo em 2D mas para cima em 3D
  const y3D = anchor.ref3D.y - (normalizedY * anchor.height3D / 2);
  
  // Calcular Z com curvatura anatômica
  const lateralDistance = Math.abs(x3D);
  const verticalDistance = Math.abs(y3D - GLB_MODEL_PARAMS.centerY);
  
  // Aplicar curvatura: quadrática lateral, potência 1.5 vertical
  const lateralCurve = Math.pow(lateralDistance, 2) * anchor.curvatureX;
  const verticalCurve = Math.pow(verticalDistance, 1.5) * anchor.curvatureY;
  
  let z3D = anchor.ref3D.z - lateralCurve - verticalCurve;
  
  // Adicionar offset de superfície
  z3D += anchor.surfaceOffset;
  
  // Limitar Z aos limites do modelo
  z3D = Math.max(GLB_MODEL_PARAMS.bounds.zMin, Math.min(GLB_MODEL_PARAMS.bounds.zMax, z3D));
  
  return [x3D, y3D, z3D];
}

/**
 * Converte posição 3D de volta para coordenadas 2D (0-100%)
 * Usada no modo de edição do Face3DViewer
 */
export function threeDToPercent(
  x3D: number, 
  y3D: number, 
  z3D: number
): { x: number; y: number } {
  // Determinar zona aproximada baseado na posição Y
  let zone: AnatomicalZone = 'unknown';
  
  if (y3D > 1.0) {
    zone = 'frontalis';
  } else if (y3D > 0.55 && Math.abs(x3D) < 0.4) {
    zone = 'glabella';
  } else if (y3D > 0.25 && Math.abs(x3D) > 0.5) {
    zone = 'periorbital';
  } else if (y3D > -0.10 && y3D < 0.40 && Math.abs(x3D) < 0.3) {
    zone = 'nasal';
  } else if (y3D > -0.65 && y3D < -0.25) {
    zone = 'perioral';
  } else if (y3D < -0.65) {
    zone = 'mentalis';
  } else if (Math.abs(x3D) > 0.7) {
    zone = 'masseter';
  }
  
  const anchor = ZONE_3D_ANCHORS[zone];
  const bounds = ZONE_BOUNDARIES[zone];
  
  // Calcular offset normalizado da referência
  let normalizedX = (x3D - anchor.ref3D.x) / (anchor.width3D / 2);
  const normalizedY = -(y3D - anchor.ref3D.y) / (anchor.height3D / 2);
  
  // Para zonas bilaterais, ajustar para lado correto
  if (zone === 'periorbital' || zone === 'masseter') {
    if (x3D < 0) {
      normalizedX = (x3D + anchor.ref3D.x) / (anchor.width3D / 2);
    }
  }
  
  // Converter para coordenadas 2D
  let x2D: number;
  if (zone === 'periorbital' || zone === 'masseter') {
    const isLeftSide = x3D < 0;
    const sideCenter = isLeftSide ? bounds.centerX : (1 - bounds.centerX);
    x2D = (sideCenter + normalizedX / 2) * 100;
  } else {
    x2D = (bounds.centerX + normalizedX / 2) * 100;
  }
  
  const y2D = (bounds.centerY + normalizedY / 2) * 100;
  
  return {
    x: Math.round(Math.max(0, Math.min(100, x2D))),
    y: Math.round(Math.max(0, Math.min(100, y2D))),
  };
}

/**
 * Valida se as coordenadas estão dentro da zona anatômica esperada
 */
export function validateCoordinatesForZone(
  x: number, 
  y: number, 
  zone: AnatomicalZone
): { valid: boolean; warning?: string } {
  const bounds = ZONE_BOUNDARIES[zone];
  const xNorm = x / 100;
  const yNorm = y / 100;
  
  // Verificar zonas bilaterais
  if (zone === 'periorbital' || zone === 'masseter') {
    const isLeftSide = xNorm < 0.5;
    const leftBounds = bounds;
    const rightBounds = {
      xMin: 1 - bounds.xMax,
      xMax: 1 - bounds.xMin,
      yMin: bounds.yMin,
      yMax: bounds.yMax,
    };
    
    const activeBounds = isLeftSide ? leftBounds : rightBounds;
    
    if (xNorm < activeBounds.xMin || xNorm > activeBounds.xMax ||
        yNorm < activeBounds.yMin || yNorm > activeBounds.yMax) {
      return {
        valid: false,
        warning: `Coordenadas fora da zona ${zone}: x=${x}%, y=${y}%`,
      };
    }
  } else {
    if (xNorm < bounds.xMin || xNorm > bounds.xMax ||
        yNorm < bounds.yMin || yNorm > bounds.yMax) {
      return {
        valid: false,
        warning: `Coordenadas fora da zona ${zone}: x=${x}%, y=${y}%`,
      };
    }
  }
  
  return { valid: true };
}

/**
 * Detecta automaticamente o músculo com base nas coordenadas 3D
 */
export function detectMuscleFrom3D(x3D: number, y3D: number): string {
  // Frontalis: testa superior (y > 1.0)
  if (y3D > 1.0) return "frontalis";
  
  // Procerus: centro glabela (y 0.55-0.90, x perto do centro)
  if (y3D > 0.55 && y3D < 0.90 && Math.abs(x3D) < 0.20) return "procerus";
  
  // Corrugadores: lateral ao procerus
  if (y3D > 0.55 && y3D < 0.85 && x3D < -0.20 && x3D > -0.65) return "corrugator_left";
  if (y3D > 0.55 && y3D < 0.85 && x3D > 0.20 && x3D < 0.65) return "corrugator_right";
  
  // Orbicularis oculi: área lateral dos olhos
  if (y3D > 0.25 && y3D < 0.65 && x3D < -0.50) return "orbicularis_oculi_left";
  if (y3D > 0.25 && y3D < 0.65 && x3D > 0.50) return "orbicularis_oculi_right";
  
  // Nasalis: área do nariz
  if (y3D > -0.10 && y3D < 0.40 && Math.abs(x3D) < 0.30) return "nasalis";
  
  // Orbicularis oris: área da boca
  if (y3D > -0.65 && y3D < -0.25 && Math.abs(x3D) < 0.45) return "orbicularis_oris";
  
  // Mentalis: área do queixo
  if (y3D < -0.65 && Math.abs(x3D) < 0.40) return "mentalis";
  
  // Masseter: lateral da mandíbula
  if (y3D > -0.60 && y3D < 0.0 && Math.abs(x3D) > 0.70) {
    return "masseter";
  }
  
  // Fallback
  return "procerus";
}

/**
 * Exporta as âncoras 3D para uso no Face3DViewer
 */
export function getZone3DAnchors() {
  return ZONE_3D_ANCHORS;
}

/**
 * Exporta os limites das zonas para validação
 */
export function getZoneBoundaries() {
  return ZONE_BOUNDARIES;
}

/**
 * Exporta os parâmetros do modelo GLB
 */
export function getGLBModelParams() {
  return GLB_MODEL_PARAMS;
}
