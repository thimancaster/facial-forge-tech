-- Make patient-photos bucket public so getPublicUrl() works
UPDATE storage.buckets SET public = true WHERE id = 'patient-photos';

-- Create RLS policy for public read access
CREATE POLICY "Public read access for patient photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'patient-photos');

-- Add new fields to patients table for comprehensive patient management
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS skin_type TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS preferred_product TEXT DEFAULT 'OnabotulinumtoxinA',
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'feminino';

-- Add next appointment date to analyses for follow-up tracking
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS next_appointment_date DATE;