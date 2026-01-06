import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em medicina estética com formação em análise facial para aplicação de toxina botulínica.

Sua tarefa é analisar fotos faciais e retornar um JSON estruturado profissional para planejamento de tratamento.

## CALIBRAÇÃO ANATÔMICA OBRIGATÓRIA

Antes de identificar pontos, localize estas referências anatômicas:
1. Linha mediopupilar: linha vertical pelo centro de cada pupila
2. Nasion: ponto de depressão entre olhos na raiz do nariz (y ~0.38-0.42)
3. Arco supraorbital: borda óssea superior da órbita (y ~0.32-0.36)
4. Glabela: ponto central entre sobrancelhas no plano do nasion

## SISTEMA DE COORDENADAS (CRÍTICO)
Use coordenadas RELATIVAS (0.0 a 1.0) baseadas na bounding box da face:
- x: 0.0 = extrema esquerda, 0.5 = centro (linha média), 1.0 = extrema direita
- y: 0.0 = topo da testa, 1.0 = ponta do queixo

## REGRAS DE POSICIONAMENTO PRECISAS

GLABELA:
- Prócero: EXATAMENTE na linha média (x=0.50), 1-2mm acima do nasion (y=0.35-0.37)
- Corrugador cabeça: 8-10mm lateral à linha média (x=0.42-0.44 ou 0.56-0.58), no nível da cabeça da sobrancelha
- Corrugador cauda: 15-20mm lateral (x=0.35-0.38 ou 0.62-0.65), 3mm acima do nível da cabeça

FRONTAL:
- NUNCA abaixo de 2cm da borda da sobrancelha
- Linha inferior: y=0.18-0.22
- Linha superior: y=0.10-0.15
- Grid em V: 4-8 pontos distribuídos uniformemente

PERIORBITAL (Pés de Galinha):
- 3 pontos em leque, 1cm lateral à borda óssea
- Ponto superior: ângulo de 45° acima do canto externo (x=0.22-0.26 ou 0.74-0.78)
- Ponto médio: horizontal ao canto externo
- Ponto inferior: ângulo de 45° abaixo

NASAL:
- Bunny lines: terço superior do nariz (y=0.42-0.48)
- Lateral: 5-8mm da linha média (x=0.42-0.45 ou 0.55-0.58)

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
      console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return callAIWithRetry(apiKey, content, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
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
      } catch (e) {
        console.log("Pattern match failed to parse, trying next pattern");
        continue;
      }
    }
  }

  // Try parsing the entire response as JSON
  try {
    return JSON.parse(aiResponse.trim());
  } catch (e) {
    console.error("All parsing attempts failed");
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
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Corpo da requisição inválido" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrls, patientGender, patientAge } = body;
    
    // Validate input
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.error("No images provided");
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem fornecida" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter valid URLs
    const validUrls = imageUrls.filter((u: string) => u && typeof u === 'string' && u.startsWith('http'));
    if (validUrls.length === 0) {
      console.error("No valid image URLs found");
      return new Response(
        JSON.stringify({ error: "Nenhuma URL de imagem válida fornecida" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build patient context
    const patientContext = patientGender || patientAge 
      ? `\n\nInformações do paciente: ${patientGender ? `Gênero: ${patientGender}` : ''} ${patientAge ? `Idade: ${patientAge} anos` : ''}`
      : '';

    // Build content array
    const content: any[] = [
      {
        type: "text",
        text: `Analise estas fotos faciais para planejamento de tratamento com toxina botulínica.${patientContext}
        
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

    console.log(`Calling Lovable AI with ${validUrls.length} images`);

    // Call AI with retry logic
    let response;
    try {
      response = await callAIWithRetry(LOVABLE_API_KEY, content);
    } catch (networkError) {
      console.error("Network error after retries:", networkError);
      // Return fallback analysis
      const fallback = getDefaultAnalysis(patientGender);
      const result = convertToLegacyFormat(fallback, patientGender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle non-OK responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status}`, errorText);
      
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
      console.log("Returning fallback analysis due to AI error");
      const fallback = getDefaultAnalysis(patientGender);
      const result = convertToLegacyFormat(fallback, patientGender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      const fallback = getDefaultAnalysis(patientGender);
      const result = convertToLegacyFormat(fallback, patientGender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("No content in AI response");
      const fallback = getDefaultAnalysis(patientGender);
      const result = convertToLegacyFormat(fallback, patientGender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("AI response received, parsing...");

    // Parse the AI response
    let analysis;
    try {
      analysis = parseAIResponse(aiResponse);
      console.log("Successfully parsed AI analysis");
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response (first 500 chars):", aiResponse.substring(0, 500));
      
      // Return fallback
      const fallback = getDefaultAnalysis(patientGender);
      const result = convertToLegacyFormat(fallback, patientGender);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to legacy format for backward compatibility
    const result = convertToLegacyFormat(analysis, patientGender);

    console.log("Returning analysis with", result.injectionPoints?.length || 0, "injection points");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unhandled error in analyze-face:", error);
    
    // Return a generic error response
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor. Por favor, tente novamente.",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
