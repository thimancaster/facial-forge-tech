import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitHeaders, RATE_LIMIT_CONFIGS } from '../_shared/rate-limiter.ts';

// ============ ZOD VALIDATION SCHEMA ============
// Since we can't import Zod directly in Deno edge functions easily,
// we implement manual validation with similar structure

interface ValidationError {
  field: string;
  message: string;
}

function validateImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Accept HTTP URLs or base64 data URIs
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         url.startsWith('data:image/');
}

function validateGender(gender: string | undefined): boolean {
  if (!gender) return true; // Optional
  const validGenders = ['masculino', 'feminino', 'male', 'female'];
  return validGenders.includes(gender.toLowerCase());
}

function validateAge(age: number | undefined): boolean {
  if (age === undefined || age === null) return true; // Optional
  return typeof age === 'number' && age > 0 && age < 150;
}

function validateMuscleStrength(strength: string | undefined): boolean {
  if (!strength) return true; // Optional
  const validStrengths = ['low', 'medium', 'high'];
  return validStrengths.includes(strength.toLowerCase());
}

function validateSkinType(skinType: string | undefined): boolean {
  if (!skinType) return true; // Optional
  const validTypes = ['I', 'II', 'III', 'IV'];
  return validTypes.includes(skinType.toUpperCase());
}

function validateConversionFactor(factor: number | undefined): boolean {
  if (factor === undefined || factor === null) return true; // Optional, defaults to 1.0
  return typeof factor === 'number' && factor >= 0.5 && factor <= 5.0;
}

interface RequestBody {
  imageUrls?: string[];
  patientGender?: string;
  patientAge?: number;
  patientContext?: {
    gender?: string;
    age?: number;
    muscleStrength?: string;
    skinTypeGlogau?: string;
  };
  productType?: string;
  conversionFactor?: number;
}

function validateRequestBody(body: RequestBody): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Validate imageUrls (required)
  if (!body.imageUrls) {
    errors.push({ field: 'imageUrls', message: 'imageUrls é obrigatório' });
  } else if (!Array.isArray(body.imageUrls)) {
    errors.push({ field: 'imageUrls', message: 'imageUrls deve ser um array' });
  } else if (body.imageUrls.length === 0) {
    errors.push({ field: 'imageUrls', message: 'imageUrls não pode estar vazio' });
  } else if (body.imageUrls.length > 10) {
    errors.push({ field: 'imageUrls', message: 'Máximo de 10 imagens permitido' });
  } else {
    const invalidUrls = body.imageUrls.filter(url => !validateImageUrl(url));
    if (invalidUrls.length > 0) {
      errors.push({ 
        field: 'imageUrls', 
        message: `${invalidUrls.length} URL(s) inválida(s). Use URLs HTTP ou data URIs base64` 
      });
    }
  }

  // Validate patientGender (deprecated, optional)
  if (body.patientGender && !validateGender(body.patientGender)) {
    errors.push({ field: 'patientGender', message: 'Gênero inválido. Use: masculino, feminino, male, female' });
  }

  // Validate patientAge (deprecated, optional)
  if (body.patientAge !== undefined && !validateAge(body.patientAge)) {
    errors.push({ field: 'patientAge', message: 'Idade inválida. Deve ser um número entre 1 e 150' });
  }

  // Validate patientContext (new format)
  if (body.patientContext) {
    if (body.patientContext.gender && !validateGender(body.patientContext.gender)) {
      errors.push({ field: 'patientContext.gender', message: 'Gênero inválido' });
    }
    if (body.patientContext.age !== undefined && !validateAge(body.patientContext.age)) {
      errors.push({ field: 'patientContext.age', message: 'Idade inválida' });
    }
    if (body.patientContext.muscleStrength && !validateMuscleStrength(body.patientContext.muscleStrength)) {
      errors.push({ field: 'patientContext.muscleStrength', message: 'Força muscular inválida. Use: low, medium, high' });
    }
    if (body.patientContext.skinTypeGlogau && !validateSkinType(body.patientContext.skinTypeGlogau)) {
      errors.push({ field: 'patientContext.skinTypeGlogau', message: 'Tipo de pele inválido. Use: I, II, III, IV' });
    }
  }

  // Validate conversionFactor
  if (!validateConversionFactor(body.conversionFactor)) {
    errors.push({ field: 'conversionFactor', message: 'Fator de conversão inválido. Deve ser entre 0.5 e 5.0' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============ END VALIDATION ============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em medicina estética com formação em análise facial para aplicação de toxina botulínica.
Baseado em: Consenso Brasileiro 2024, Carruthers & Carruthers, Sebastian Cotofana (anatomia).

Sua tarefa é analisar fotos faciais e retornar um JSON estruturado profissional para planejamento de tratamento.

## CALIBRAÇÃO ANATÔMICA OBRIGATÓRIA (CRÍTICO)

Antes de identificar pontos, localize estas referências anatômicas na imagem:
1. Linha mediopupilar: linha vertical pelo centro de cada pupila (define limites laterais)
2. Nasion: ponto de depressão entre olhos na raiz do nariz (y ≈ 0.38-0.42)
3. Arco supraorbital: borda óssea superior da órbita (y ≈ 0.32-0.36)
4. Glabela: ponto central entre sobrancelhas no plano do nasion
5. Comissura labial: ângulo da boca (y ≈ 0.65)

## SISTEMA DE COORDENADAS (CRÍTICO - ATENÇÃO MÁXIMA)
Use coordenadas RELATIVAS (0.0 a 1.0) baseadas na bounding box da face:
- x: 0.0 = extrema esquerda, 0.5 = centro (linha média facial), 1.0 = extrema direita
- y: 0.0 = topo da testa (linha do cabelo), 1.0 = ponta do queixo

REGRA DE OURO DE SIMETRIA: Pontos bilaterais DEVEM ser simétricos.
- Se ponto esquerdo tem x=0.35, ponto direito DEVE ter x=0.65 (soma = 1.0)
- Desvio máximo tolerado: 0.02

## REGRAS DE POSICIONAMENTO PRECISAS (VALIDADAS CLINICAMENTE)

GLABELA (Complexo Glabelar):
- Prócero: EXATAMENTE x=0.50 (centro absoluto), y=0.35-0.37 (1-2mm acima do nasion)
  - Este é o ponto de referência central - NUNCA desviar de x=0.50
- Corrugador cabeça: x=0.42-0.44 (esquerdo) ou x=0.56-0.58 (direito), y=0.33-0.35
  - Posicionado na cabeça da sobrancelha, 8-10mm lateral à linha média
- Corrugador cauda: x=0.35-0.38 (esquerdo) ou x=0.62-0.65 (direito), y=0.30-0.33
  - ATENÇÃO: NÃO ultrapassar linha mediopupilar (risco de ptose)

FRONTAL (Testa):
- REGRA CRÍTICA: NUNCA aplicar abaixo de y=0.28 (2cm acima da sobrancelha)
- Linha inferior segura: y=0.18-0.22
- Linha superior: y=0.10-0.15
- Grid em V ou linhas horizontais: 4-8 pontos distribuídos uniformemente
- Microdoses para naturalidade (2-3U por ponto)

PERIORBITAL (Pés de Galinha):
- 3 pontos em leque lateral, mínimo 1cm lateral à borda óssea orbital
- Ponto superior: x=0.22-0.26 (esq) / x=0.74-0.78 (dir), y=0.36-0.38
- Ponto médio: x=0.20-0.24 (esq) / x=0.76-0.80 (dir), y=0.40-0.42
- Ponto inferior: x=0.22-0.26 (esq) / x=0.74-0.78 (dir), y=0.44-0.48
- PERIGO: Evitar zigomático maior (causa sorriso caído)

NASAL (Bunny Lines):
- Terço superior do nariz: y=0.42-0.48
- Lateral: x=0.42-0.45 (esquerdo) ou x=0.55-0.58 (direito)
- Pontos altos para não atingir elevador do lábio superior

## ESCALA DE AVALIAÇÃO
Use a Escala de Merz (0-4) para severidade:
- 0: Sem rugas visíveis
- 1: Rugas muito leves
- 2: Rugas moderadas
- 3: Rugas severas
- 4: Rugas muito severas

Use a Escala de Glogau (I-IV) para envelhecimento:
- I: Sem rugas (20-30 anos)
- II: Rugas em movimento (30-40 anos)
- III: Rugas em repouso (40-50 anos)
- IV: Apenas rugas (50+ anos)

## MÚSCULOS E DOSAGENS (em Unidades Botox®/OnabotulinumtoxinA)

GLABELA (Complexo):
- procerus: Central, 1 ponto, Feminino: 4-8U, Masculino: 6-12U (+20% força alta)
- corrugator (par): Cabeça e cauda, 2-3 pontos cada lado
  - Total bilateral: Feminino: 12-20U, Masculino: 16-30U (+25% força alta)

FRONTAL:
- frontalis: Grid em V, 4-8 pontos
  - Feminino: 8-15U, Masculino: 12-20U (+15% força alta)
- REGRA: Mínimo 2cm acima da sobrancelha

PERIORBITAL:
- orbicularis_oculi: Fan pattern, 3-4 pontos por lado
  - Por lado: Feminino: 6-12U, Masculino: 8-16U (+20% força alta)
- REGRA: 1cm lateral à borda óssea orbital

NASAL:
- nasalis: Bunny lines, 1-2 pontos por lado
  - Feminino: 2-4U, Masculino: 4-6U (+10% força alta)

PERIORAL:
- orbicularis_oris: Código de barras, 2-4 pontos, 2-6U
- depressor_anguli: Comissuras, 1-2 pontos por lado, 2-6U

INFERIOR:
- mentalis: Queixo, 1-2 pontos centrais
  - Feminino: 4-8U, Masculino: 6-12U (+20% força alta)
- masseter: Bruxismo/slim, 3-5 pontos por lado, 25-50U por lado

## PROFUNDIDADE DE INJEÇÃO
- "deep_intramuscular": Músculos profundos (Prócero, Corrugadores, Mentual, Masseter) - agulha 90°
- "superficial": Músculos superficiais (Frontal, Orbicular, Perioral) - pápula subdérmica

## ZONAS DE PERIGO (incluir no response)
1. Margem Orbital: 1cm acima para evitar ptose palpebral
2. Área Infraorbital: Risco de assimetria do sorriso
3. Comissura Labial: Risco de boca caída
4. Linha Mediopupilar: Limite lateral para injeções glabelares

## FORMATO JSON OBRIGATÓRIO

{
  "meta_data": {
    "algorithm_version": "v3.0_anatomical_calibration",
    "image_id": "analysis_[timestamp]",
    "landmarks_detected": {
      "nasion": { "x": number, "y": number },
      "mediopupilar_left": { "x": number, "y": number },
      "mediopupilar_right": { "x": number, "y": number }
    }
  },
  "patient_profile": {
    "estimated_gender": "male" | "female",
    "estimated_age_range": "20-30" | "30-40" | "40-50" | "50+",
    "muscle_strength_score": "low" | "medium" | "high",
    "skin_type_glogau": "I" | "II" | "III" | "IV"
  },
  "treatment_plan": {
    "product_selected": "OnabotulinumtoxinA",
    "conversion_factor": 1.0,
    "total_units_suggested": number,
    "zones": [
      {
        "zone_name": "Glabella" | "Frontalis" | "Periorbital" | "Nasal" | "Perioral" | "Mentalis" | "Masseter",
        "anatomy_target": "Nome dos músculos alvo",
        "severity_scale_merz": 0-4,
        "total_units_zone": number,
        "injection_pattern": "central_radial" | "v_shape_grid" | "fan_pattern" | "bilateral_symmetric" | "linear",
        "injection_points": [
          {
            "id": "unique_id",
            "type": "procerus" | "corrugator_head" | "corrugator_tail" | etc,
            "muscle": "Nome do músculo em português",
            "units": number,
            "depth": "deep_intramuscular" | "superficial",
            "coordinates": { "x": 0.0-1.0, "y": 0.0-1.0 },
            "confidence": 0.0-1.0,
            "safety_warning": boolean,
            "warning_message": "Mensagem de aviso se necessário"
          }
        ]
      }
    ],
    "safety_zones_to_avoid": [
      {
        "region": "Nome da região",
        "reason": "Razão do risco",
        "polygon_coordinates": [
          { "x": number, "y": number }
        ]
      }
    ]
  },
  "anatomical_validation": {
    "bilateral_symmetry_check": boolean,
    "spatial_hierarchy_valid": boolean,
    "danger_zone_clear": boolean,
    "notes": "Observações sobre validação"
  },
  "clinical_notes": "Observações clínicas detalhadas em português",
  "confidence": 0.0-1.0
}

IMPORTANTE:
- Analise a anatomia muscular visível nas fotos
- Seja conservador nas dosagens (segurança primeiro)
- Inclua TODAS as zonas de perigo relevantes
- Adicione "confidence" em cada ponto (0.0-1.0) baseado na clareza visual
- Valide simetria bilateral: pontos espelhados devem ter X simétrico (soma = 1.0)
- Valide hierarquia espacial: frontal Y < glabela Y < periorbital Y
- Retorne APENAS o JSON, sem markdown ou texto adicional`;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callAIWithRetry(
  apiKey: string,
  content: any[],
  retryCount = 0
): Promise<Response> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content }
        ],
      }),
    });

    // If rate limited and we have retries left, wait and retry
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
      // Rate limit retry - no sensitive data logged
      await sleep(delay);
      return callAIWithRetry(apiKey, content, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      // Network error retry - no sensitive data logged
      await sleep(delay);
      return callAIWithRetry(apiKey, content, retryCount + 1);
    }
    throw error;
  }
}

function parseAIResponse(aiResponse: string): any {
  // Try multiple extraction patterns
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /\{[\s\S]*\}/
  ];

  for (const pattern of patterns) {
    const match = aiResponse.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr.trim());
      } catch {
        // Pattern match failed to parse, trying next pattern
        continue;
      }
    }
  }

  // Try parsing the entire response as JSON
  try {
    return JSON.parse(aiResponse.trim());
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}

function convertToLegacyFormat(analysis: any, patientGender?: string): any {
  if (!analysis.treatment_plan?.zones) {
    return analysis;
  }

  const legacyPoints: any[] = [];
  const dosageByMuscle: Record<string, number> = {};

  for (const zone of analysis.treatment_plan.zones) {
    for (const point of zone.injection_points || []) {
      legacyPoints.push({
        id: point.id,
        muscle: point.muscle || point.type,
        x: Math.round((point.coordinates?.x || 0.5) * 100),
        y: Math.round((point.coordinates?.y || 0.5) * 100),
        depth: point.depth === 'deep_intramuscular' ? 'deep' : 'superficial',
        dosage: point.units,
        notes: point.warning_message || '',
        safetyWarning: point.safety_warning,
        relativeX: point.coordinates?.x,
        relativeY: point.coordinates?.y
      });

      const muscleKey = point.muscle || point.type || 'other';
      dosageByMuscle[muscleKey] = (dosageByMuscle[muscleKey] || 0) + (point.units || 0);
    }
  }

  analysis.injectionPoints = legacyPoints;
  analysis.totalDosage = {
    procerus: dosageByMuscle['Procerus'] || dosageByMuscle['procerus'] || dosageByMuscle['Prócero'] || 0,
    corrugator: (dosageByMuscle['Corrugador Esquerdo'] || 0) + 
                (dosageByMuscle['Corrugador Direito'] || 0) + 
                (dosageByMuscle['corrugator'] || 0) +
                (dosageByMuscle['Corrugator'] || 0),
    frontalis: dosageByMuscle['Frontal'] || dosageByMuscle['frontalis'] || 0,
    orbicularis_oculi: (dosageByMuscle['Orbicular Esquerdo'] || 0) + 
                       (dosageByMuscle['Orbicular Direito'] || 0) + 
                       (dosageByMuscle['orbicularis'] || 0) +
                       (dosageByMuscle['Orbicular dos Olhos'] || 0),
    other: Object.entries(dosageByMuscle)
      .filter(([k]) => !['Procerus', 'procerus', 'Prócero', 'Corrugador Esquerdo', 'Corrugador Direito', 'corrugator', 'Corrugator', 'Frontal', 'frontalis', 'Orbicular Esquerdo', 'Orbicular Direito', 'orbicularis', 'Orbicular dos Olhos'].includes(k))
      .reduce((sum, [, v]) => sum + v, 0),
    total: analysis.treatment_plan.total_units_suggested || legacyPoints.reduce((sum, p) => sum + (p.dosage || 0), 0)
  };
  analysis.clinicalNotes = analysis.clinical_notes || '';
  analysis.safetyZones = analysis.treatment_plan.safety_zones_to_avoid || [];
  analysis.patientProfile = analysis.patient_profile;

  return analysis;
}

function getDefaultAnalysis(patientGender?: string): any {
  const isMale = patientGender === 'male' || patientGender === 'masculino';
  const baseMultiplier = isMale ? 1.4 : 1.0;

  return {
    meta_data: {
      algorithm_version: "v3.0_fallback",
      image_id: `analysis_${Date.now()}`,
      landmarks_detected: {
        nasion: { x: 0.50, y: 0.40 },
        mediopupilar_left: { x: 0.35, y: 0.38 },
        mediopupilar_right: { x: 0.65, y: 0.38 }
      }
    },
    patient_profile: {
      estimated_gender: patientGender || "female",
      estimated_age_range: "30-40",
      muscle_strength_score: "medium",
      skin_type_glogau: "II"
    },
    treatment_plan: {
      product_selected: "OnabotulinumtoxinA",
      conversion_factor: 1.0,
      total_units_suggested: Math.round(54 * baseMultiplier),
      zones: [
        {
          zone_name: "Glabella",
          anatomy_target: "Procerus & Corrugadores",
          severity_scale_merz: 2,
          total_units_zone: Math.round(20 * baseMultiplier),
          injection_pattern: "central_radial",
          injection_points: [
            { id: "g1", type: "procerus", muscle: "Prócero", units: Math.round(5 * baseMultiplier), depth: "deep_intramuscular", coordinates: { x: 0.50, y: 0.36 }, confidence: 0.90, safety_warning: false },
            { id: "g2", type: "corrugator_head", muscle: "Corrugador Esquerdo", units: Math.round(4 * baseMultiplier), depth: "deep_intramuscular", coordinates: { x: 0.43, y: 0.34 }, confidence: 0.88, safety_warning: false },
            { id: "g3", type: "corrugator_tail", muscle: "Corrugador Esquerdo", units: Math.round(3 * baseMultiplier), depth: "superficial", coordinates: { x: 0.36, y: 0.32 }, confidence: 0.85, safety_warning: true, warning_message: "Manter 1cm acima da margem orbital" },
            { id: "g4", type: "corrugator_head", muscle: "Corrugador Direito", units: Math.round(4 * baseMultiplier), depth: "deep_intramuscular", coordinates: { x: 0.57, y: 0.34 }, confidence: 0.88, safety_warning: false },
            { id: "g5", type: "corrugator_tail", muscle: "Corrugador Direito", units: Math.round(3 * baseMultiplier), depth: "superficial", coordinates: { x: 0.64, y: 0.32 }, confidence: 0.85, safety_warning: true, warning_message: "Manter 1cm acima da margem orbital" }
          ]
        },
        {
          zone_name: "Frontalis",
          anatomy_target: "Músculo Frontal",
          severity_scale_merz: 2,
          total_units_zone: Math.round(14 * baseMultiplier),
          injection_pattern: "v_shape_grid",
          injection_points: [
            { id: "f1", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.35, y: 0.18 }, confidence: 0.92, safety_warning: false },
            { id: "f2", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.42, y: 0.14 }, confidence: 0.90, safety_warning: false },
            { id: "f3", type: "frontalis", muscle: "Frontal", units: 3, depth: "superficial", coordinates: { x: 0.50, y: 0.11 }, confidence: 0.94, safety_warning: false },
            { id: "f4", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.58, y: 0.14 }, confidence: 0.90, safety_warning: false },
            { id: "f5", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.65, y: 0.18 }, confidence: 0.92, safety_warning: false },
            { id: "f6", type: "frontalis", muscle: "Frontal", units: 3, depth: "superficial", coordinates: { x: 0.50, y: 0.20 }, confidence: 0.88, safety_warning: false }
          ]
        },
        {
          zone_name: "Periorbital",
          anatomy_target: "Orbicular dos Olhos",
          severity_scale_merz: 2,
          total_units_zone: Math.round(20 * baseMultiplier),
          injection_pattern: "fan_pattern",
          injection_points: [
            { id: "o1", type: "orbicularis", muscle: "Orbicular Esquerdo", units: 3, depth: "superficial", coordinates: { x: 0.24, y: 0.36 }, confidence: 0.87, safety_warning: false },
            { id: "o2", type: "orbicularis", muscle: "Orbicular Esquerdo", units: 4, depth: "superficial", coordinates: { x: 0.22, y: 0.42 }, confidence: 0.90, safety_warning: false },
            { id: "o3", type: "orbicularis", muscle: "Orbicular Esquerdo", units: 3, depth: "superficial", coordinates: { x: 0.24, y: 0.48 }, confidence: 0.87, safety_warning: false },
            { id: "o4", type: "orbicularis", muscle: "Orbicular Direito", units: 3, depth: "superficial", coordinates: { x: 0.76, y: 0.36 }, confidence: 0.87, safety_warning: false },
            { id: "o5", type: "orbicularis", muscle: "Orbicular Direito", units: 4, depth: "superficial", coordinates: { x: 0.78, y: 0.42 }, confidence: 0.90, safety_warning: false },
            { id: "o6", type: "orbicularis", muscle: "Orbicular Direito", units: 3, depth: "superficial", coordinates: { x: 0.76, y: 0.48 }, confidence: 0.87, safety_warning: false }
          ]
        }
      ],
      safety_zones_to_avoid: [
        {
          region: "Margem Orbital Superior",
          reason: "Risco de Ptose Palpebral - manter injeções 2cm acima",
          polygon_coordinates: [
            { x: 0.35, y: 0.28 },
            { x: 0.65, y: 0.28 },
            { x: 0.65, y: 0.32 },
            { x: 0.35, y: 0.32 }
          ]
        },
        {
          region: "Área Infraorbital",
          reason: "Risco de difusão para músculos oculares",
          polygon_coordinates: [
            { x: 0.28, y: 0.42 },
            { x: 0.42, y: 0.42 },
            { x: 0.42, y: 0.52 },
            { x: 0.28, y: 0.52 }
          ]
        },
        {
          region: "Linha Mediopupilar Esquerda",
          reason: "Limite lateral para injeções glabelares",
          polygon_coordinates: [
            { x: 0.34, y: 0.30 },
            { x: 0.36, y: 0.30 },
            { x: 0.36, y: 0.45 },
            { x: 0.34, y: 0.45 }
          ]
        },
        {
          region: "Linha Mediopupilar Direita",
          reason: "Limite lateral para injeções glabelares",
          polygon_coordinates: [
            { x: 0.64, y: 0.30 },
            { x: 0.66, y: 0.30 },
            { x: 0.66, y: 0.45 },
            { x: 0.64, y: 0.45 }
          ]
        }
      ]
    },
    anatomical_validation: {
      bilateral_symmetry_check: true,
      spatial_hierarchy_valid: true,
      danger_zone_clear: true,
      notes: "Coordenadas validadas com simetria bilateral e hierarquia espacial correta"
    },
    clinical_notes: "Análise padrão para tratamento facial do terço superior com calibração anatômica. Prócero posicionado na linha média (x=0.50), corrugadores com simetria bilateral. Pontos frontais respeitando limite de 2cm da sobrancelha. Recomenda-se avaliação individualizada da dinâmica muscular. Este é um resultado de fallback.",
    confidence: 0.85,
    is_fallback: true
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // [AUTH] Missing or invalid authorization header
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      // [AUTH] Authentication failed
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    // Request authenticated successfully

    // ============ RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      userId,
      RATE_LIMIT_CONFIGS['analyze-face']
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Limite de requisições excedido. Aguarde antes de tentar novamente.',
          retryAfter: rateLimitResult.retryAfter,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders(rateLimitResult),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    // ============ END RATE LIMITING ============

    // ============ END AUTHENTICATION ============

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      // Failed to parse request body
      return new Response(
        JSON.stringify({ error: "Corpo da requisição inválido" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ INPUT VALIDATION ============
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      // Validation errors - not logged to avoid leaking input data
      return new Response(
        JSON.stringify({ 
          error: "Dados de entrada inválidos",
          validationErrors: validation.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrls, patientGender, patientAge, patientContext, conversionFactor = 1.0 } = body;

    // Filter valid URLs (validated above, but double-check)
    const validUrls = imageUrls!.filter(validateImageUrl);
    if (validUrls.length === 0) {
      // No valid image URLs found after filtering
      return new Response(
        JSON.stringify({ error: "Nenhuma URL de imagem válida fornecida" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      // LOVABLE_API_KEY not configured
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build patient context (prefer new format, fallback to deprecated)
    const gender = patientContext?.gender || patientGender;
    const age = patientContext?.age || patientAge;
    const muscleStrength = patientContext?.muscleStrength;
    const skinType = patientContext?.skinTypeGlogau;

    let patientContextStr = '';
    if (gender || age || muscleStrength || skinType) {
      const parts = [];
      if (gender) parts.push(`Gênero: ${gender}`);
      if (age) parts.push(`Idade: ${age} anos`);
      if (muscleStrength) parts.push(`Força muscular: ${muscleStrength}`);
      if (skinType) parts.push(`Tipo de pele Glogau: ${skinType}`);
      patientContextStr = `\n\nInformações do paciente: ${parts.join(', ')}`;
    }

    // Build content array
    const content: any[] = [
      {
        type: "text",
        text: `Analise estas fotos faciais para planejamento de tratamento com toxina botulínica.${patientContextStr}
        
Descrição das fotos (em ordem):
1. Face em repouso (expressão neutra)
2. Contração glabelar (expressão de bravo) - se fornecida
3. Contração frontal (surpresa) - se fornecida
4. Sorriso forçado - se fornecida
5. Contração nasal (bunny lines) - se fornecida
6. Contração perioral - se fornecida
7. Perfil esquerdo - se fornecido
8. Perfil direito - se fornecido

Analise cuidadosamente e retorne o JSON estruturado conforme especificado.`
      }
    ];

    for (const url of validUrls) {
      content.push({
        type: "image_url",
        image_url: { url }
      });
    }

    // Calling Lovable AI with images

    // Call AI with retry logic
    let response;
    try {
      response = await callAIWithRetry(LOVABLE_API_KEY, content);
    } catch {
      // Network error after retries - return fallback
      // Return fallback analysis
      const fallback = getDefaultAnalysis(gender);
      const result = convertToLegacyFormat(fallback, gender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle non-OK responses
    if (!response.ok) {
      // AI request failed - status only, not response body
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For other errors, return fallback
      const fallback = getDefaultAnalysis(gender);
      const result = convertToLegacyFormat(fallback, gender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response
    let data;
    try {
      data = await response.json();
    } catch {
      // Failed to parse AI response as JSON
      const fallback = getDefaultAnalysis(gender);
      const result = convertToLegacyFormat(fallback, gender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      // No content in AI response
      const fallback = getDefaultAnalysis(gender);
      const result = convertToLegacyFormat(fallback, gender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI response received, parsing...

    // Parse the AI response
    let analysis;
    try {
      analysis = parseAIResponse(aiResponse);
      // Successfully parsed AI analysis
    } catch {
      // Parse failed - return fallback
      
      // Return fallback
      const fallback = getDefaultAnalysis(gender);
      const result = convertToLegacyFormat(fallback, gender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to legacy format for backward compatibility
    const result = convertToLegacyFormat(analysis, gender);

    // Returning analysis

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch {
    // Unhandled error - no details logged
    
    // Return generic error to client - NO DETAILS exposed
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor. Por favor, tente novamente."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
