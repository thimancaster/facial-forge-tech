-- Adicionar novas colunas na tabela analyses
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS patient_gender TEXT DEFAULT 'feminino',
ADD COLUMN IF NOT EXISTS skin_type_glogau TEXT DEFAULT 'II',
ADD COLUMN IF NOT EXISTS muscle_strength_score TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'OnabotulinumtoxinA',
ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS smile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS nasal_photo_url TEXT,
ADD COLUMN IF NOT EXISTS perioral_photo_url TEXT,
ADD COLUMN IF NOT EXISTS profile_left_photo_url TEXT,
ADD COLUMN IF NOT EXISTS profile_right_photo_url TEXT,
ADD COLUMN IF NOT EXISTS safety_zones JSONB,
ADD COLUMN IF NOT EXISTS treatment_zones JSONB;

-- Criar tabela de templates de tratamento
CREATE TABLE IF NOT EXISTS public.treatment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  zone_type TEXT NOT NULL,
  default_units INTEGER NOT NULL,
  gender_modifier_male DECIMAL DEFAULT 1.3,
  gender_modifier_female DECIMAL DEFAULT 1.0,
  muscle_modifier_high DECIMAL DEFAULT 1.2,
  muscle_modifier_medium DECIMAL DEFAULT 1.0,
  muscle_modifier_low DECIMAL DEFAULT 0.8,
  injection_points JSONB NOT NULL,
  injection_pattern TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir templates pré-definidos baseados na literatura médica
INSERT INTO public.treatment_templates (name, description, zone_type, default_units, injection_points, injection_pattern) VALUES
('Glabelar Padrão', 'Tratamento padrão para rugas glabelares - 5 pontos no complexo Procerus/Corrugador', 'glabella', 20, 
 '[{"id":"g1_procerus","muscle":"Procerus","units":4,"depth":"deep_intramuscular","coordinates":{"x":0.50,"y":0.38}},{"id":"g2_corr_left_head","muscle":"Corrugador Esquerdo","units":5,"depth":"deep_intramuscular","coordinates":{"x":0.45,"y":0.36}},{"id":"g3_corr_left_tail","muscle":"Corrugador Esquerdo","units":3,"depth":"superficial","coordinates":{"x":0.40,"y":0.34}},{"id":"g4_corr_right_head","muscle":"Corrugador Direito","units":5,"depth":"deep_intramuscular","coordinates":{"x":0.55,"y":0.36}},{"id":"g5_corr_right_tail","muscle":"Corrugador Direito","units":3,"depth":"superficial","coordinates":{"x":0.60,"y":0.34}}]',
 'central_radial'),
('Frontal Completo', 'Tratamento para linhas horizontais da testa - 4-8 pontos em V', 'frontalis', 14,
 '[{"id":"f1_left_lateral","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.35,"y":0.22}},{"id":"f2_left_medial","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.42,"y":0.20}},{"id":"f3_right_medial","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.58,"y":0.20}},{"id":"f4_right_lateral","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.65,"y":0.22}},{"id":"f5_center_left","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.45,"y":0.15}},{"id":"f6_center_right","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.55,"y":0.15}}]',
 'v_shape_grid'),
('Periorbital Bilateral', 'Pés de galinha - 3-4 pontos por lado', 'periorbital', 20,
 '[{"id":"o1_left_upper","muscle":"Orbicular Esquerdo","units":3,"depth":"superficial","coordinates":{"x":0.28,"y":0.40}},{"id":"o2_left_middle","muscle":"Orbicular Esquerdo","units":4,"depth":"superficial","coordinates":{"x":0.26,"y":0.44}},{"id":"o3_left_lower","muscle":"Orbicular Esquerdo","units":3,"depth":"superficial","coordinates":{"x":0.28,"y":0.48}},{"id":"o4_right_upper","muscle":"Orbicular Direito","units":3,"depth":"superficial","coordinates":{"x":0.72,"y":0.40}},{"id":"o5_right_middle","muscle":"Orbicular Direito","units":4,"depth":"superficial","coordinates":{"x":0.74,"y":0.44}},{"id":"o6_right_lower","muscle":"Orbicular Direito","units":3,"depth":"superficial","coordinates":{"x":0.72,"y":0.48}}]',
 'fan_pattern'),
('Bunny Lines (Nasal)', 'Linhas do coelho no nariz - 2 pontos por lado', 'nasal', 6,
 '[{"id":"n1_left","muscle":"Nasal Transverso","units":2,"depth":"superficial","coordinates":{"x":0.45,"y":0.48}},{"id":"n2_right","muscle":"Nasal Transverso","units":2,"depth":"superficial","coordinates":{"x":0.55,"y":0.48}},{"id":"n3_left_low","muscle":"Nasal Transverso","units":1,"depth":"superficial","coordinates":{"x":0.46,"y":0.50}}]',
 'bilateral_symmetric'),
('Mentual (Queixo)', 'Tratamento para queixo de casca de laranja', 'mentalis', 8,
 '[{"id":"m1_left","muscle":"Mentual","units":4,"depth":"deep_intramuscular","coordinates":{"x":0.46,"y":0.85}},{"id":"m2_right","muscle":"Mentual","units":4,"depth":"deep_intramuscular","coordinates":{"x":0.54,"y":0.85}}]',
 'bilateral_symmetric'),
('Perioral Superior', 'Código de barras labial superior', 'perioral', 4,
 '[{"id":"p1_left","muscle":"Orbicular Labial","units":1,"depth":"superficial","coordinates":{"x":0.44,"y":0.68}},{"id":"p2_center_left","muscle":"Orbicular Labial","units":1,"depth":"superficial","coordinates":{"x":0.48,"y":0.67}},{"id":"p3_center_right","muscle":"Orbicular Labial","units":1,"depth":"superficial","coordinates":{"x":0.52,"y":0.67}},{"id":"p4_right","muscle":"Orbicular Labial","units":1,"depth":"superficial","coordinates":{"x":0.56,"y":0.68}}]',
 'linear'),
('Masseter (Bruxismo)', 'Tratamento para hipertrofia masseter/bruxismo', 'masseter', 60,
 '[{"id":"ma1_left_upper","muscle":"Masseter Esquerdo","units":10,"depth":"deep_intramuscular","coordinates":{"x":0.25,"y":0.65}},{"id":"ma2_left_middle","muscle":"Masseter Esquerdo","units":10,"depth":"deep_intramuscular","coordinates":{"x":0.23,"y":0.70}},{"id":"ma3_left_lower","muscle":"Masseter Esquerdo","units":10,"depth":"deep_intramuscular","coordinates":{"x":0.25,"y":0.75}},{"id":"ma4_right_upper","muscle":"Masseter Direito","units":10,"depth":"deep_intramuscular","coordinates":{"x":0.75,"y":0.65}},{"id":"ma5_right_middle","muscle":"Masseter Direito","units":10,"depth":"deep_intramuscular","coordinates":{"x":0.77,"y":0.70}},{"id":"ma6_right_lower","muscle":"Masseter Direito","units":10,"depth":"deep_intramuscular","coordinates":{"x":0.75,"y":0.75}}]',
 'grid'),
('Terço Superior Completo', 'Combinação: Glabelar + Frontal + Periorbital', 'full_upper', 54,
 '[{"id":"g1_procerus","muscle":"Procerus","units":4,"depth":"deep_intramuscular","coordinates":{"x":0.50,"y":0.38}},{"id":"g2_corr_left","muscle":"Corrugador Esquerdo","units":4,"depth":"deep_intramuscular","coordinates":{"x":0.45,"y":0.36}},{"id":"g3_corr_right","muscle":"Corrugador Direito","units":4,"depth":"deep_intramuscular","coordinates":{"x":0.55,"y":0.36}},{"id":"f1_left","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.40,"y":0.22}},{"id":"f2_right","muscle":"Frontal","units":2,"depth":"superficial","coordinates":{"x":0.60,"y":0.22}},{"id":"o1_left","muscle":"Orbicular Esquerdo","units":4,"depth":"superficial","coordinates":{"x":0.27,"y":0.44}},{"id":"o2_right","muscle":"Orbicular Direito","units":4,"depth":"superficial","coordinates":{"x":0.73,"y":0.44}}]',
 'combined')
ON CONFLICT DO NOTHING;

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_treatment_templates_updated_at
BEFORE UPDATE ON public.treatment_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();