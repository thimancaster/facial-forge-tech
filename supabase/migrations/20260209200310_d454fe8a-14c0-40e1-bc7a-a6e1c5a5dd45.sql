-- Add column to persist face landmark bounding boxes per photo type
ALTER TABLE public.analyses
ADD COLUMN face_boxes jsonb DEFAULT NULL;

COMMENT ON COLUMN public.analyses.face_boxes IS 'Persisted faceBox (normalized 0-1 rect) per photo type, e.g. {"resting":{"x":0.1,"y":0.05,"width":0.8,"height":0.9}}';
