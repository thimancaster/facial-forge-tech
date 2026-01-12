import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface DashboardStats {
  patients: number;
  analyses: number;
}

export interface Analysis {
  id: string;
  patient_id: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  resting_photo_url: string | null;
  glabellar_photo_url: string | null;
  frontal_photo_url: string | null;
  created_at: string;
  status: string | null;
  patients?: {
    name: string;
    age: number | null;
  };
}

export interface DashboardPatient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  observations?: string | null;
  photo_url?: string | null;
}

// Query keys for cache management
export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  recentAnalyses: () => [...dashboardKeys.all, "recentAnalyses"] as const,
  patients: () => [...dashboardKeys.all, "patients"] as const,
  analyses: () => [...dashboardKeys.all, "analyses"] as const,
};

// Fetch dashboard stats (patients and analyses counts)
async function fetchDashboardStats(): Promise<DashboardStats> {
  const [patientsRes, analysesRes] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("analyses").select("id", { count: "exact", head: true }),
  ]);

  return {
    patients: patientsRes.count || 0,
    analyses: analysesRes.count || 0,
  };
}

// Fetch recent analyses
async function fetchRecentAnalyses(): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("id, procerus_dosage, corrugator_dosage, resting_photo_url, created_at, patients(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data as Analysis[]) || [];
}

// Fetch all patients
async function fetchPatients(): Promise<DashboardPatient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Fetch all analyses with patient info
async function fetchAnalyses(): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "id, patient_id, procerus_dosage, corrugator_dosage, resting_photo_url, glabellar_photo_url, frontal_photo_url, created_at, status, patients(name, age)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Analysis[]) || [];
}

// Hooks
export function useDashboardStats(userId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: fetchDashboardStats,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
}

export function useRecentAnalyses(userId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.recentAnalyses(),
    queryFn: fetchRecentAnalyses,
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function usePatients(userId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.patients(),
    queryFn: fetchPatients,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useAnalyses(userId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.analyses(),
    queryFn: fetchAnalyses,
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}
