-- Add AI analysis columns to analyses table
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS ai_injection_points JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_clinical_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2) DEFAULT NULL;