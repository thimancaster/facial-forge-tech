import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardStats } from "@/components/DashboardStats";
import { NewAnalysisWizard } from "@/components/NewAnalysisWizard";
import { PatientsList } from "@/components/PatientsList";
import { AnalysesGallery } from "@/components/AnalysesGallery";
import { ProfileSettings } from "@/components/ProfileSettings";
import { RecentAnalyses } from "@/components/RecentAnalyses";
import { BeforeAfterComparison } from "@/components/BeforeAfterComparison";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PlusCircle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Analysis {
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

function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ patients: 0, analyses: 0 });
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [patientsRes, analysesRes, recentRes] = await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase.from("analyses").select("id", { count: "exact", head: true }),
      supabase
        .from("analyses")
        .select("id, procerus_dosage, corrugator_dosage, resting_photo_url, created_at, patients(name)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setStats({
      patients: patientsRes.count || 0,
      analyses: analysesRes.count || 0,
    });

    setRecentAnalyses((recentRes.data as Analysis[]) || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bem-vindo de volta! Aqui está um resumo da sua atividade.
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/new-analysis")}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Análise
        </Button>
      </div>

      <DashboardStats patientsCount={stats.patients} analysesCount={stats.analyses} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard/new-analysis")}
            >
              <PlusCircle className="w-4 h-4 mr-3" />
              Iniciar Nova Análise Facial
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard/patients")}
            >
              <Users className="w-4 h-4 mr-3" />
              Ver Pacientes Cadastrados
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard/comparison")}
            >
              <TrendingUp className="w-4 h-4 mr-3" />
              Comparativo Antes/Depois
            </Button>
          </CardContent>
        </Card>

        <RecentAnalyses analyses={recentAnalyses} />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Guia Rápido</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>1.</strong> Cadastre seu paciente com dados básicos
          </p>
          <p>
            <strong>2.</strong> Tire as 3 fotos do protocolo (repouso, glabelar, frontal)
          </p>
          <p>
            <strong>3.</strong> O sistema sugere dosagens baseadas na análise muscular
          </p>
          <p>
            <strong>4.</strong> Ajuste conforme necessário e salve o protocolo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    setPatients(data || []);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Pacientes</h1>
      {isLoading ? (
        <Card className="border-border/50">
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <PatientsList patients={patients} onRefresh={fetchPatients} />
      )}
    </div>
  );
}

function ProtocolsPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchAnalyses();
  }, [user]);

  const fetchAnalyses = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("analyses")
      .select(
        "id, patient_id, procerus_dosage, corrugator_dosage, resting_photo_url, glabellar_photo_url, frontal_photo_url, created_at, status, patients(name, age)"
      )
      .order("created_at", { ascending: false });
    setAnalyses((data as Analysis[]) || []);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Galeria de Análises</h1>
      {isLoading ? (
        <Card className="border-border/50">
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <AnalysesGallery analyses={analyses} onRefresh={fetchAnalyses} />
      )}
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Configurações</h1>
      <ProfileSettings />
    </div>
  );
}

function ComparisonPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Comparativo de Evolução</h1>
      <BeforeAfterComparison />
    </div>
  );
}

function NewAnalysisPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const patientId = searchParams.get('patientId');
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">
        {patientId ? 'Nova Consulta' : 'Nova Análise Facial'}
      </h1>
      <NewAnalysisWizard initialPatientId={patientId || undefined} />
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar onSignOut={signOut} />

        <main className="flex-1 overflow-auto">
          <header className="h-14 border-b border-border/50 flex items-center px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm text-muted-foreground">Portal Médico</span>
          </header>

          <div className="p-6">
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="patients" element={<PatientsPage />} />
              <Route path="new-analysis" element={<NewAnalysisPage />} />
              <Route path="protocols" element={<ProtocolsPage />} />
              <Route path="comparison" element={<ComparisonPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
