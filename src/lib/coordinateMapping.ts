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
// RECALIBRADOS para o modelo GLB em escala 2.5
// 
// METODOLOGIA DE CALIBRAÇÃO:
// 1. Cada zona foi posicionada visualmente sobre o modelo GLB
// 2. ref3D aponta para o CENTRO da zona anatômica
// 3. width3D/height3D definem a extensão da zona
// 4. curvatureX/Y compensam a curvatura da superfície facial
// 5. surfaceOffset garante que pontos fiquem NA superfície (não dentro)
//
// COORDENADAS GLB (escala 2.5):
// - X: -1.2 (esquerda) a +1.2 (direita), 0 = centro
// - Y: -1.0 (queixo) a +1.6 (testa), 0.2 = nível do nariz
// - Z: 0.5 (orelhas) a 2.0 (ponta do nariz), maior = mais frontal

const ZONE_3D_ANCHORS: Record<AnatomicalZone, {
  // Posição de referência no modelo 3D (centro da zona)
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
  // ═══════════════════════════════════════════════════════
  // GLABELA: Complexo glabelar (procerus + corrugadores)
  // Entre as sobrancelhas, região mais proeminente do terço superior
  // ═══════════════════════════════════════════════════════
  glabella: {
    ref3D: { x: 0, y: 0.68, z: 1.72 },  // Ajustado: mais alto e mais frontal
    width3D: 0.80,    // Largura total da glabela
    height3D: 0.40,   // Altura vertical
    curvatureX: 0.06, // Curvatura lateral suave (região central)
    curvatureY: 0.03, // Curvatura vertical mínima
    surfaceOffset: 0.04,
  },
  
  // ═══════════════════════════════════════════════════════
  // FRONTAL: Testa superior (músculo frontal)
  // REGRA CLÍNICA: mínimo 2cm acima da sobrancelha
  // ═══════════════════════════════════════════════════════
  frontalis: {
    ref3D: { x: 0, y: 1.28, z: 1.25 },  // Ajustado: centro da testa
    width3D: 1.60,    // Largura ampla da testa
    height3D: 0.65,   // Altura da zona frontal
    curvatureX: 0.22, // Curvatura lateral significativa
    curvatureY: 0.14, // Curvatura vertical (testa recua para cima)
    surfaceOffset: 0.05,
  },
  
  // ═══════════════════════════════════════════════════════
  // PERIORBITAL: Lateral aos olhos (pés de galinha)
  // Referência é para o LADO DIREITO, espelhado para esquerdo
  // ═══════════════════════════════════════════════════════
  periorbital: {
    ref3D: { x: 0.82, y: 0.42, z: 1.32 },  // Ajustado: canto externo do olho
    width3D: 0.50,    // Largura da zona periorbital
    height3D: 0.45,   // Altura vertical
    curvatureX: 0.32, // Curvatura lateral forte (região temporal)
    curvatureY: 0.07, // Curvatura vertical suave
    surfaceOffset: 0.04,
  },
  
  // ═══════════════════════════════════════════════════════
  // NASAL: Bunny lines (linhas do nariz)
  // Parte superior do nariz, logo abaixo da glabela
  // ═══════════════════════════════════════════════════════
  nasal: {
    ref3D: { x: 0, y: 0.18, z: 1.88 },  // Ajustado: dorso nasal
    width3D: 0.32,    // Largura estreita do nariz
    height3D: 0.42,   // Altura vertical do nariz
    curvatureX: 0.10, // Curvatura lateral moderada
    curvatureY: 0.08, // Curvatura vertical (nariz projeta-se)
    surfaceOffset: 0.03,
  },
  
  // ═══════════════════════════════════════════════════════
  // PERIORAL: Ao redor da boca
  // Inclui orbicular da boca e músculos adjacentes
  // ═══════════════════════════════════════════════════════
  perioral: {
    ref3D: { x: 0, y: -0.48, z: 1.68 },  // Ajustado: centro da boca
    width3D: 0.72,    // Largura da região perioral
    height3D: 0.40,   // Altura vertical
    curvatureX: 0.12, // Curvatura lateral moderada
    curvatureY: 0.05, // Curvatura vertical suave
    surfaceOffset: 0.04,
  },
  
  // ═══════════════════════════════════════════════════════
  // MENTALIS: Queixo (músculo mentual)
  // Parte inferior da face, protuberância do queixo
  // ═══════════════════════════════════════════════════════
  mentalis: {
    ref3D: { x: 0, y: -0.85, z: 1.48 },  // Ajustado: centro do queixo
    width3D: 0.45,    // Largura do queixo
    height3D: 0.32,   // Altura vertical
    curvatureX: 0.16, // Curvatura lateral (queixo arredondado)
    curvatureY: 0.20, // Curvatura vertical forte (queixo projeta-se)
    surfaceOffset: 0.04,
  },
  
  // ═══════════════════════════════════════════════════════
  // MASSETER: Lateral da mandíbula
  // Referência é para o LADO DIREITO, espelhado para esquerdo
  // ═══════════════════════════════════════════════════════
  masseter: {
    ref3D: { x: 0.98, y: -0.28, z: 0.78 },  // Ajustado: ângulo mandibular
    width3D: 0.55,    // Largura do masseter
    height3D: 0.65,   // Altura vertical
    curvatureX: 0.38, // Curvatura lateral forte (lateral da face)
    curvatureY: 0.08, // Curvatura vertical suave
    surfaceOffset: 0.05,
  },
  
  // ═══════════════════════════════════════════════════════
  // FALLBACK: Zona desconhecida
  // ═══════════════════════════════════════════════════════
  unknown: {
    ref3D: { x: 0, y: 0.25, z: 1.60 },
    width3D: 1.0,
    height3D: 1.0,
    curvatureX: 0.18,
    curvatureY: 0.12,
    surfaceOffset: 0.04,
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
 * ALGORITMO PRECISO:
 * 1. Determina a zona anatômica a partir do músculo
 * 2. Calcula a posição relativa do ponto dentro dos limites da zona 2D
 * 3. Mapeia essa posição relativa para as dimensões da zona 3D
 * 4. Trata zonas bilaterais (periorbital, masseter) espelhando para lado esquerdo
 * 5. Aplica curvatura da superfície para Z baseado na distância do centro
 * 6. Adiciona offset de superfície para garantir renderização correta
 * 
 * @param x - Coordenada X em porcentagem (0-100, 50 = centro)
 * @param y - Coordenada Y em porcentagem (0-100, 0 = topo, 100 = base)
 * @param muscle - Nome do músculo para determinar a zona anatômica
 * @returns [x, y, z] Coordenadas 3D no espaço do modelo GLB
 */
export function percentTo3D(
  x: number, 
  y: number, 
  muscle: string
): [number, number, number] {
  const zone = getZoneFromMuscle(muscle);
  const anchor = ZONE_3D_ANCHORS[zone];
  const bounds = ZONE_BOUNDARIES[zone];
  
  // Normalizar coordenadas de entrada (0-100 → 0-1)
  const xNorm = x / 100;
  const yNorm = y / 100;
  
  // Para zonas bilaterais, determinar qual lado
  const isBilateral = zone === 'periorbital' || zone === 'masseter';
  const isLeftSide = xNorm < 0.5;
  
  // Calcular posição relativa dentro da zona 2D (-1 a +1)
  let relativeX: number;
  let relativeY: number;
  
  if (isBilateral) {
    // Zonas bilaterais: calcular posição relativa ao centro do lado correto
    if (isLeftSide) {
      // Lado esquerdo: limites são espelhados
      const leftCenterX = bounds.centerX;
      const halfWidth = (bounds.xMax - bounds.xMin) / 2;
      relativeX = (xNorm - leftCenterX) / halfWidth;
    } else {
      // Lado direito: limites originais
      const rightCenterX = 1 - bounds.centerX;
      const halfWidth = (bounds.xMax - bounds.xMin) / 2;
      relativeX = (xNorm - rightCenterX) / halfWidth;
    }
  } else {
    // Zonas centrais: posição relativa ao centro da zona
    const halfWidth = (bounds.xMax - bounds.xMin) / 2;
    relativeX = (xNorm - bounds.centerX) / halfWidth;
  }
  
  // Y: posição relativa ao centro da zona (invertido porque Y cresce para baixo em 2D)
  const halfHeight = (bounds.yMax - bounds.yMin) / 2;
  relativeY = (yNorm - bounds.centerY) / halfHeight;
  
  // Limitar valores relativos para evitar pontos fora da zona
  relativeX = Math.max(-1, Math.min(1, relativeX));
  relativeY = Math.max(-1, Math.min(1, relativeY));
  
  // ═══════════════════════════════════════════════════════
  // CONVERTER PARA COORDENADAS 3D
  // ═══════════════════════════════════════════════════════
  
  // X: aplicar dimensão da zona 3D
  let x3D: number;
  if (isBilateral) {
    if (isLeftSide) {
      // Lado esquerdo: espelhar referência para X negativo
      x3D = -anchor.ref3D.x + (relativeX * anchor.width3D / 2);
    } else {
      // Lado direito: usar referência positiva
      x3D = anchor.ref3D.x + (relativeX * anchor.width3D / 2);
    }
  } else {
    x3D = anchor.ref3D.x + (relativeX * anchor.width3D / 2);
  }
  
  // Y: inverter porque Y cresce para cima em 3D (oposto de 2D)
  const y3D = anchor.ref3D.y - (relativeY * anchor.height3D / 2);
  
  // ═══════════════════════════════════════════════════════
  // CALCULAR Z COM CURVATURA ANATÔMICA
  // ═══════════════════════════════════════════════════════
  
  // Distâncias do centro para aplicar curvatura
  const lateralDistance = Math.abs(x3D);
  const verticalDistance = Math.abs(y3D - GLB_MODEL_PARAMS.centerY);
  
  // Curvatura lateral: quadrática (mais forte nas bordas)
  const lateralCurve = Math.pow(lateralDistance, 2) * anchor.curvatureX;
  
  // Curvatura vertical: potência 1.5 (moderada)
  const verticalCurve = Math.pow(verticalDistance, 1.5) * anchor.curvatureY;
  
  // Z base menos as curvaturas
  let z3D = anchor.ref3D.z - lateralCurve - verticalCurve;
  
  // Adicionar offset de superfície para renderização correta
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
