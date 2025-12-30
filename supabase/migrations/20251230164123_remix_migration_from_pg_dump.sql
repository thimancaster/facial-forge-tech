CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    resting_photo_url text,
    glabellar_photo_url text,
    frontal_photo_url text,
    procerus_dosage integer DEFAULT 0,
    corrugator_dosage integer DEFAULT 0,
    notes text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_injection_points jsonb,
    ai_clinical_notes text,
    ai_confidence numeric(3,2) DEFAULT NULL::numeric,
    patient_gender text DEFAULT 'feminino'::text,
    skin_type_glogau text DEFAULT 'II'::text,
    muscle_strength_score text DEFAULT 'medium'::text,
    product_type text DEFAULT 'OnabotulinumtoxinA'::text,
    conversion_factor numeric DEFAULT 1.0,
    smile_photo_url text,
    nasal_photo_url text,
    perioral_photo_url text,
    profile_left_photo_url text,
    profile_right_photo_url text,
    safety_zones jsonb,
    treatment_zones jsonb
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    age integer,
    observations text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    specialty text,
    clinic_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: treatment_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    zone_type text NOT NULL,
    default_units integer NOT NULL,
    gender_modifier_male numeric DEFAULT 1.3,
    gender_modifier_female numeric DEFAULT 1.0,
    muscle_modifier_high numeric DEFAULT 1.2,
    muscle_modifier_medium numeric DEFAULT 1.0,
    muscle_modifier_low numeric DEFAULT 0.8,
    injection_points jsonb NOT NULL,
    injection_pattern text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: analyses analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: treatment_templates treatment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_templates
    ADD CONSTRAINT treatment_templates_pkey PRIMARY KEY (id);


--
-- Name: analyses update_analyses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patients update_patients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: treatment_templates update_treatment_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_treatment_templates_updated_at BEFORE UPDATE ON public.treatment_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: analyses analyses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: analyses analyses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: patients patients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: treatment_templates Authenticated users can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view templates" ON public.treatment_templates FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: treatment_templates Templates are read-only for delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Templates are read-only for delete" ON public.treatment_templates FOR DELETE USING (false);


--
-- Name: treatment_templates Templates are read-only for update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Templates are read-only for update" ON public.treatment_templates FOR UPDATE USING (false);


--
-- Name: treatment_templates Templates are read-only for users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Templates are read-only for users" ON public.treatment_templates FOR INSERT WITH CHECK (false);


--
-- Name: analyses Users can delete their own analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own analyses" ON public.analyses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: patients Users can delete their own patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own patients" ON public.patients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: analyses Users can insert their own analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own analyses" ON public.analyses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: patients Users can insert their own patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own patients" ON public.patients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: analyses Users can update their own analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own analyses" ON public.analyses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: patients Users can update their own patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own patients" ON public.patients FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: analyses Users can view their own analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own analyses" ON public.analyses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: patients Users can view their own patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own patients" ON public.patients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: analyses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_templates ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;