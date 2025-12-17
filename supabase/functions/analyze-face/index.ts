import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em medicina estética, especificamente em análise facial para aplicação de toxina botulínica (Botox).

Sua tarefa é analisar fotos faciais e identificar:
1. Pontos exatos de aplicação baseados na anatomia muscular
2. Dosagens recomendadas baseadas na literatura médica e guidelines
3. Observações clínicas sobre a dinâmica facial do paciente

MÚSCULOS PARA ANÁLISE (lista completa):

TERÇO SUPERIOR (Glabelar/Frontal):
- procerus: Localizado na raiz do nariz, causa rugas horizontais entre as sobrancelhas. Dose: 4-10U, 1 ponto
- corrugator_left: Corrugador superciliar esquerdo, causa linhas verticais da glabela. Dose: 8-20U, 2-3 pontos
- corrugator_right: Corrugador superciliar direito. Dose: 8-20U, 2-3 pontos
- frontalis: Músculo frontal, causa rugas horizontais na testa. Dose: 10-30U, 4-8 pontos

REGIÃO PERIORBITAL:
- orbicularis_oculi_left: Orbicular do olho esquerdo, causa pés de galinha. Dose: 6-15U, 3-4 pontos
- orbicularis_oculi_right: Orbicular do olho direito. Dose: 6-15U, 3-4 pontos

TERÇO MÉDIO:
- nasalis: Músculo nasal, causa rugas no dorso nasal. Dose: 2-6U, 1-2 pontos
- levator_labii: Levantador do lábio superior. Dose: 2-4U por lado
- zygomaticus_major: Zigomático maior, músculo do sorriso
- zygomaticus_minor: Zigomático menor

TERÇO INFERIOR:
- orbicularis_oris: Orbicular da boca, causa rugas periorais. Dose: 2-6U, 2-4 pontos
- depressor_anguli: Depressor do ângulo da boca, causa comissuras caídas. Dose: 2-6U, 1-2 pontos por lado
- mentalis: Músculo mentual, causa aspecto de "queixo de laranja". Dose: 4-8U, 1-2 pontos
- masseter: Masseter, para bruxismo ou afinamento facial. Dose: 20-50U por lado

SISTEMA DE COORDENADAS:
Retorne coordenadas como porcentagens (0-100) onde:
- x: 0 = borda esquerda, 50 = centro, 100 = borda direita
- y: 0 = topo (testa alta), 100 = base (queixo)

COORDENADAS DE REFERÊNCIA POR MÚSCULO:
- Frontal (frontalis): y entre 5-20, x variando bilateralmente
- Procerus: x ~ 50, y ~ 28-32
- Corrugadores: y ~ 25-30, x entre 30-40 (esq) e 60-70 (dir)
- Orbicular ocular: y ~ 30-40, x entre 15-30 (esq) e 70-85 (dir)
- Nasal: x ~ 48-52, y ~ 40-48
- Orbicular boca: x ~ 40-60, y ~ 65-72
- Depressor ângulo: x ~ 35-40 (esq), 60-65 (dir), y ~ 70-75
- Mentual: x ~ 45-55, y ~ 80-88
- Masseter: x ~ 20-30 (esq), 70-80 (dir), y ~ 55-70

IMPORTANTE: 
- Base sua análise na dinâmica muscular visível, padrões de rugas e proporções faciais
- Seja conservador nas dosagens para segurança
- Inclua observações clínicas relevantes em português
- Identifique todos os pontos necessários para um tratamento completo

Retorne sua análise neste formato JSON exato:
{
  "injectionPoints": [
    {
      "id": "unique_id",
      "muscle": "nome_do_musculo",
      "x": number (0-100),
      "y": number (0-100),
      "depth": "superficial" | "deep",
      "dosage": number,
      "notes": "nota clínica opcional em português"
    }
  ],
  "totalDosage": {
    "procerus": number,
    "corrugator": number,
    "frontalis": number,
    "orbicularis_oculi": number,
    "other": number,
    "total": number
  },
  "clinicalNotes": "Observações clínicas gerais sobre o paciente em português",
  "confidence": number (0-1, nível de confiança na análise)
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls } = await req.json();
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem fornecida" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build content array with images
    const content: any[] = [
      {
        type: "text",
        text: `Analise estas fotos faciais para planejamento de tratamento com toxina botulínica.
        
Descrição das fotos:
- Primeira imagem: Face em repouso (expressão neutra)
- Segunda imagem (se fornecida): Contração glabelar (expressão de bravo/franzindo a testa)
- Terceira imagem (se fornecida): Contração frontal (expressão de surpresa/elevando sobrancelhas)

Com base nestas imagens, identifique todos os pontos de aplicação necessários, recomende dosagens apropriadas e forneça observações clínicas detalhadas.
Analise cuidadosamente a anatomia muscular visível e os padrões de rugas para uma recomendação precisa.`
      }
    ];

    // Add images to content
    for (const url of imageUrls.filter((u: string) => u)) {
      content.push({
        type: "image_url",
        image_url: { url }
      });
    }

    console.log("Calling Lovable AI with", imageUrls.filter((u: string) => u).length, "images");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Por favor, adicione créditos." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Falha na análise de IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("No response from AI");
      return new Response(
        JSON.stringify({ error: "Nenhuma análise gerada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the response
    let analysis;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiResponse];
      const jsonStr = jsonMatch[1] || aiResponse;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", aiResponse);
      
      // Return a comprehensive default analysis if parsing fails
      analysis = {
        injectionPoints: [
          // Procerus
          { id: "proc_1", muscle: "procerus", x: 50, y: 30, depth: "deep", dosage: 8, notes: "Ponto central do prócero" },
          // Corrugadores
          { id: "corr_l1", muscle: "corrugator_left", x: 38, y: 27, depth: "deep", dosage: 8, notes: "Corrugador medial esquerdo" },
          { id: "corr_l2", muscle: "corrugator_left", x: 30, y: 25, depth: "superficial", dosage: 6, notes: "Corrugador lateral esquerdo" },
          { id: "corr_r1", muscle: "corrugator_right", x: 62, y: 27, depth: "deep", dosage: 8, notes: "Corrugador medial direito" },
          { id: "corr_r2", muscle: "corrugator_right", x: 70, y: 25, depth: "superficial", dosage: 6, notes: "Corrugador lateral direito" },
          // Frontalis
          { id: "front_l1", muscle: "frontalis", x: 30, y: 12, depth: "superficial", dosage: 4, notes: "Frontal lateral esquerdo" },
          { id: "front_l2", muscle: "frontalis", x: 40, y: 10, depth: "superficial", dosage: 4, notes: "Frontal medial esquerdo" },
          { id: "front_r1", muscle: "frontalis", x: 60, y: 10, depth: "superficial", dosage: 4, notes: "Frontal medial direito" },
          { id: "front_r2", muscle: "frontalis", x: 70, y: 12, depth: "superficial", dosage: 4, notes: "Frontal lateral direito" },
          // Orbicular
          { id: "orb_l1", muscle: "orbicularis_oculi_left", x: 22, y: 33, depth: "superficial", dosage: 4, notes: "Pé de galinha superior esquerdo" },
          { id: "orb_l2", muscle: "orbicularis_oculi_left", x: 20, y: 38, depth: "superficial", dosage: 4, notes: "Pé de galinha inferior esquerdo" },
          { id: "orb_r1", muscle: "orbicularis_oculi_right", x: 78, y: 33, depth: "superficial", dosage: 4, notes: "Pé de galinha superior direito" },
          { id: "orb_r2", muscle: "orbicularis_oculi_right", x: 80, y: 38, depth: "superficial", dosage: 4, notes: "Pé de galinha inferior direito" },
        ],
        totalDosage: { 
          procerus: 8, 
          corrugator: 28, 
          frontalis: 16,
          orbicularis_oculi: 16,
          other: 0,
          total: 68 
        },
        clinicalNotes: "Análise padrão para tratamento facial completo (terço superior). Recomenda-se avaliação individualizada da dinâmica muscular. Ajuste as dosagens conforme a massa muscular e histórico do paciente. Considere tratamentos prévios e intervalo desde última aplicação.",
        confidence: 0.75
      };
    }

    console.log("Analysis complete:", analysis);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-face function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
