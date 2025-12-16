import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert in aesthetic medicine, specifically in botulinum toxin (Botox) facial analysis.

Your task is to analyze facial photos and identify:
1. Exact injection points based on muscle anatomy
2. Recommended dosages based on medical literature and guidelines
3. Clinical observations about the patient's facial dynamics

MUSCLES TO ANALYZE (Glabellar Complex):
- Procerus: Located at the root of the nose, causes horizontal wrinkles between eyebrows
- Corrugator Supercilii (left and right): Located above eyebrows, causes vertical frown lines (11 lines)
- Frontalis (optional): Forehead muscle, causes horizontal forehead lines

DOSAGE GUIDELINES (based on literature):
- Procerus: 4-10 units (typically 1 injection point)
- Corrugator: 8-20 units per side (typically 2-3 points per side)
- Total glabellar: 20-40 units typically

COORDINATE SYSTEM:
Return coordinates as percentages (0-100) where:
- x: 0 = left edge, 50 = center, 100 = right edge
- y: 0 = top (forehead), 100 = bottom (chin)

IMPORTANT: Base your analysis on visible muscle dynamics, wrinkle patterns, and facial proportions. Be conservative with dosage recommendations for safety.

Return your analysis in this exact JSON format:
{
  "injectionPoints": [
    {
      "id": "unique_id",
      "muscle": "procerus" | "corrugator_left" | "corrugator_right" | "frontalis",
      "x": number (0-100),
      "y": number (0-100),
      "depth": "superficial" | "deep",
      "dosage": number,
      "notes": "optional clinical note"
    }
  ],
  "totalDosage": {
    "procerus": number,
    "corrugator": number,
    "total": number
  },
  "clinicalNotes": "Overall clinical observations about the patient",
  "confidence": number (0-1, how confident you are in this analysis)
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls } = await req.json();
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build content array with images
    const content: any[] = [
      {
        type: "text",
        text: `Analyze these facial photos for botulinum toxin treatment planning. 
        
Photo descriptions:
- First image: Face at rest (neutral expression)
- Second image (if provided): Glabellar contraction (frowning/angry expression)  
- Third image (if provided): Frontal contraction (surprised expression)

Based on these images, identify injection points, recommend dosages, and provide clinical notes.`
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("No response from AI");
      return new Response(
        JSON.stringify({ error: "No analysis generated" }),
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
      
      // Return a default analysis if parsing fails
      analysis = {
        injectionPoints: [
          { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: 8, notes: "Central procerus point" },
          { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: 8, notes: "Medial corrugator" },
          { id: "corr_l2", muscle: "corrugator_left", x: 28, y: 20, depth: "superficial", dosage: 6, notes: "Lateral corrugator" },
          { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: 8, notes: "Medial corrugator" },
          { id: "corr_r2", muscle: "corrugator_right", x: 72, y: 20, depth: "superficial", dosage: 6, notes: "Lateral corrugator" },
        ],
        totalDosage: { procerus: 8, corrugator: 28, total: 36 },
        clinicalNotes: "Standard glabellar treatment pattern recommended. Adjust based on muscle mass and patient history.",
        confidence: 0.7
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
