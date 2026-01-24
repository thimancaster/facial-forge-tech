import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRecord {
  id: string;
  created_at: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  product_type: string | null;
  ai_injection_points: any;
  muscle_strength_score: string | null;
}

interface DosageSuggestion {
  muscle: string;
  suggestedDosage: number;
  previousAverage: number;
  trend: 'increase' | 'decrease' | 'maintain';
  confidence: number;
  reasoning: string;
}

function analyzePatternAndSuggest(
  analyses: AnalysisRecord[],
  muscleStrength: string,
  patientGender: string
): DosageSuggestion[] {
  if (analyses.length < 2) {
    return [];
  }

  // Calculate historical averages by muscle
  const muscleHistory: Record<string, number[]> = {
    procerus: [],
    corrugator: [],
  };

  // Process injection points from all analyses
  analyses.forEach(analysis => {
    if (analysis.procerus_dosage) {
      muscleHistory.procerus.push(analysis.procerus_dosage);
    }
    if (analysis.corrugator_dosage) {
      muscleHistory.corrugator.push(analysis.corrugator_dosage);
    }

    // Parse AI injection points for more granular data
    if (Array.isArray(analysis.ai_injection_points)) {
      analysis.ai_injection_points.forEach((point: any) => {
        const muscle = point.muscle?.toLowerCase() || '';
        const dosage = point.dosage || 0;
        
        if (muscle.includes('frontal')) {
          muscleHistory['frontalis'] = muscleHistory['frontalis'] || [];
          muscleHistory['frontalis'].push(dosage);
        }
        if (muscle.includes('orbicular') && muscle.includes('oculi')) {
          muscleHistory['orbicularis'] = muscleHistory['orbicularis'] || [];
          muscleHistory['orbicularis'].push(dosage);
        }
      });
    }
  });

  const suggestions: DosageSuggestion[] = [];

  // Analyze each muscle
  for (const [muscle, dosages] of Object.entries(muscleHistory)) {
    if (dosages.length < 2) continue;

    const avg = dosages.reduce((a, b) => a + b, 0) / dosages.length;
    const recent = dosages.slice(-3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Calculate trend
    let trend: 'increase' | 'decrease' | 'maintain' = 'maintain';
    let adjustment = 0;
    let reasoning = '';

    // If recent average is higher than overall, patient may need more
    if (recentAvg > avg * 1.15) {
      trend = 'increase';
      adjustment = Math.round((recentAvg - avg) * 0.5);
      reasoning = `Tendência de aumento nas últimas sessões. Média recente (${Math.round(recentAvg)}U) > média histórica (${Math.round(avg)}U).`;
    } else if (recentAvg < avg * 0.85) {
      trend = 'decrease';
      adjustment = Math.round((avg - recentAvg) * 0.3);
      reasoning = `Resposta melhor nas sessões recentes. Pode-se considerar redução conservadora.`;
    } else {
      reasoning = `Dosagem estável ao longo do tempo. Manter protocolo atual.`;
    }

    // Apply muscle strength modifier
    let strengthModifier = 1.0;
    if (muscleStrength === 'high') {
      strengthModifier = 1.15;
      reasoning += ' Força muscular alta detectada - considerar aumento de 15%.';
    } else if (muscleStrength === 'low') {
      strengthModifier = 0.9;
      reasoning += ' Força muscular baixa - considerar redução de 10%.';
    }

    // Apply gender modifier
    let genderModifier = 1.0;
    if (patientGender === 'masculino' || patientGender === 'male') {
      genderModifier = 1.25;
      reasoning += ' Paciente masculino - ajuste típico de +25%.';
    }

    let suggestedDosage = Math.round(recentAvg * strengthModifier * genderModifier);
    if (trend === 'increase') {
      suggestedDosage += adjustment;
    } else if (trend === 'decrease') {
      suggestedDosage = Math.max(suggestedDosage - adjustment, Math.round(avg * 0.7));
    }

    // Calculate confidence based on data consistency
    const variance = dosages.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / dosages.length;
    const stdDev = Math.sqrt(variance);
    const coeffOfVariation = stdDev / avg;
    const confidence = Math.max(0.5, Math.min(0.95, 1 - coeffOfVariation));

    suggestions.push({
      muscle,
      suggestedDosage,
      previousAverage: Math.round(avg),
      trend,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    });
  }

  return suggestions;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { patientId, muscleStrength = 'medium', patientGender = 'feminino' } = await req.json();

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: 'patientId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch patient's analysis history
    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('id, created_at, procerus_dosage, corrugator_dosage, product_type, ai_injection_points, muscle_strength_score')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (analysesError) {
      // DB query failed - sanitized
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar histórico' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!analyses || analyses.length < 2) {
      return new Response(
        JSON.stringify({
          suggestions: [],
          message: 'Histórico insuficiente para sugestões. Mínimo de 2 sessões necessário.',
          historyCount: analyses?.length || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze patterns and generate suggestions
    const suggestions = analyzePatternAndSuggest(
      analyses as AnalysisRecord[],
      muscleStrength,
      patientGender
    );

    return new Response(
      JSON.stringify({
        suggestions,
        historyCount: analyses.length,
        message: suggestions.length > 0 
          ? `${suggestions.length} sugestões baseadas em ${analyses.length} sessões anteriores.`
          : 'Dados insuficientes para gerar sugestões específicas.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch {
    // Unhandled error - sanitized
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
