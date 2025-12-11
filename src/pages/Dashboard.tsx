import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardStats } from "@/components/DashboardStats";
import { NewAnalysisWizard } from "@/components/NewAnalysisWizard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ patients: 0, analyses: 0 });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    const [patientsRes, analysesRes] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('analyses').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      patients: patientsRes.count || 0,
      analyses: analysesRes.count || 0,
    });
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
        <Button onClick={() => navigate('/dashboard/new-analysis')}>
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
              onClick={() => navigate('/dashboard/new-analysis')}
            >
              <PlusCircle className="w-4 h-4 mr-3" />
              Iniciar Nova Análise Facial
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/patients')}
            >
              <PlusCircle className="w-4 h-4 mr-3" />
              Adicionar Novo Paciente
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Guia Rápido</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>1.</strong> Cadastre seu paciente com dados básicos</p>
            <p><strong>2.</strong> Tire as 3 fotos do protocolo (repouso, glabelar, frontal)</p>
            <p><strong>3.</strong> O sistema sugere dosagens baseadas na análise muscular</p>
            <p><strong>4.</strong> Ajuste conforme necessário e salve o protocolo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    setPatients(data || []);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Pacientes</h1>
      {patients.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum paciente cadastrado ainda.</p>
            <p className="text-sm text-muted-foreground mt-2">Inicie uma nova análise para adicionar pacientes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {patients.map((patient) => (
            <Card key={patient.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {patient.age ? `${patient.age} anos` : 'Idade não informada'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProtocolsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Protocolos</h1>
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Protocolos salvos aparecerão aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Configurações</h1>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-foreground">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ID do Usuário</p>
            <p className="text-foreground font-mono text-sm">{user?.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewAnalysisPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light text-foreground">Nova Análise Facial</h1>
      <NewAnalysisWizard />
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
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
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
