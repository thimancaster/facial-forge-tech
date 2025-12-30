import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, User, Calendar, FileText, Activity, 
  ClipboardList, TrendingUp, Camera, Loader2, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PatientTreatmentHistory } from "@/components/PatientTreatmentHistory";
import { BeforeAfterComparison } from "@/components/BeforeAfterComparison";

interface Patient {
  id: string;
  name: string;
  age: number | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

interface Analysis {
  id: string;
  created_at: string;
  status: string | null;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  product_type: string | null;
  muscle_strength_score: string | null;
  skin_type_glogau: string | null;
  patient_gender: string | null;
  ai_confidence: number | null;
  ai_clinical_notes: string | null;
  resting_photo_url: string | null;
  glabellar_photo_url: string | null;
  frontal_photo_url: string | null;
}

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();

      if (patientError) throw patientError;
      
      if (!patientData) {
        setError("Paciente não encontrado");
        setIsLoading(false);
        return;
      }

      setPatient(patientData);

      // Fetch analyses for this patient
      const { data: analysesData, error: analysesError } = await supabase
        .from('analyses')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (analysesError) throw analysesError;

      setAnalyses(analysesData || []);
    } catch (err: any) {
      console.error('Error fetching patient data:', err);
      setError(err.message || 'Erro ao carregar dados do paciente');
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProductLabel = (productType: string | null) => {
    const products: Record<string, string> = {
      'OnabotulinumtoxinA': 'Botox®',
      'AbobotulinumtoxinA': 'Dysport®',
      'IncobotulinumtoxinA': 'Xeomin®',
      'PrabotulinumtoxinA': 'Jeuveau®',
      'DaxibotulinumtoxinA': 'Daxxify®',
    };
    return products[productType || ''] || productType || 'Não especificado';
  };

  const getMuscleStrengthLabel = (score: string | null) => {
    const labels: Record<string, string> = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta',
    };
    return labels[score || ''] || 'Não avaliada';
  };

  const getGenderLabel = (gender: string | null) => {
    return gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Não informado';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando dados do paciente...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Paciente não encontrado</h2>
            <p className="text-muted-foreground mb-6">{error || "O paciente solicitado não existe ou foi removido."}</p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSessions = analyses.length;
  const completedSessions = analyses.filter(a => a.status === 'completed').length;
  const lastAnalysis = analyses[0];
  const totalUnitsUsed = analyses.reduce((sum, a) => 
    sum + (a.procerus_dosage || 0) + (a.corrugator_dosage || 0), 0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {patient.age && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {patient.age} anos
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Cadastrado em {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {totalSessions} {totalSessions === 1 ? 'sessão' : 'sessões'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Activity className="w-5 h-5 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{completedSessions}</p>
              <p className="text-xs text-muted-foreground">Tratamentos Completos</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
              <p className="text-2xl font-bold">{totalUnitsUsed}U</p>
              <p className="text-xs text-muted-foreground">Unidades Totais</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-5 h-5 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">
                {lastAnalysis ? getProductLabel(lastAnalysis.product_type).split('®')[0] : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Último Produto</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <User className="w-5 h-5 mx-auto text-violet-500 mb-2" />
              <p className="text-2xl font-bold">
                {lastAnalysis ? getMuscleStrengthLabel(lastAnalysis.muscle_strength_score) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Força Muscular</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>

          {/* Treatment History Tab */}
          <TabsContent value="history" className="space-y-6">
            {analyses.length > 0 ? (
              <PatientTreatmentHistory patientId={patient.id} patientName={patient.name} />
            ) : (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum tratamento registrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Este paciente ainda não possui histórico de tratamentos.
                  </p>
                  <Button onClick={() => navigate('/dashboard')}>
                    Iniciar Nova Análise
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            {analyses.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhuma sessão registrada.</p>
                </CardContent>
              </Card>
            ) : (
              analyses.map((analysis, index) => (
                <Card key={analysis.id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {totalSessions - index}
                        </span>
                        Sessão de {new Date(analysis.created_at).toLocaleDateString('pt-BR')}
                      </CardTitle>
                      <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                        {analysis.status === 'completed' ? 'Concluída' : 'Rascunho'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Produto</p>
                        <p className="font-medium">{getProductLabel(analysis.product_type)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prócero</p>
                        <p className="font-medium">{analysis.procerus_dosage || 0}U</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Corrugadores</p>
                        <p className="font-medium">{analysis.corrugator_dosage || 0}U</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium text-primary">
                          {(analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0)}U
                        </p>
                      </div>
                    </div>

                    {analysis.ai_clinical_notes && (
                      <div className="bg-muted/30 rounded-lg p-3 mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Notas Clínicas (IA)</p>
                        <p className="text-sm">{analysis.ai_clinical_notes}</p>
                      </div>
                    )}

                    {/* Photo thumbnails */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {analysis.resting_photo_url && (
                        <div className="flex-shrink-0">
                          <p className="text-xs text-muted-foreground mb-1">Repouso</p>
                          <img 
                            src={analysis.resting_photo_url} 
                            alt="Repouso"
                            className="w-20 h-20 object-cover rounded-lg border border-border"
                          />
                        </div>
                      )}
                      {analysis.glabellar_photo_url && (
                        <div className="flex-shrink-0">
                          <p className="text-xs text-muted-foreground mb-1">Glabelar</p>
                          <img 
                            src={analysis.glabellar_photo_url} 
                            alt="Glabelar"
                            className="w-20 h-20 object-cover rounded-lg border border-border"
                          />
                        </div>
                      )}
                      {analysis.frontal_photo_url && (
                        <div className="flex-shrink-0">
                          <p className="text-xs text-muted-foreground mb-1">Frontal</p>
                          <img 
                            src={analysis.frontal_photo_url} 
                            alt="Frontal"
                            className="w-20 h-20 object-cover rounded-lg border border-border"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Gênero: {getGenderLabel(analysis.patient_gender)}</span>
                        <span>Força: {getMuscleStrengthLabel(analysis.muscle_strength_score)}</span>
                        <span>Glogau: {analysis.skin_type_glogau || 'N/A'}</span>
                      </div>
                      {analysis.ai_confidence && (
                        <Badge variant="outline" className="text-xs">
                          IA: {Math.round(analysis.ai_confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Patient Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Dados Cadastrais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome Completo</p>
                    <p className="font-medium">{patient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Idade</p>
                    <p className="font-medium">{patient.age ? `${patient.age} anos` : 'Não informada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                    <p className="font-medium">
                      {new Date(patient.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última Atualização</p>
                    <p className="font-medium">
                      {new Date(patient.updated_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {patient.observations && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Observações</p>
                      <p className="text-sm bg-muted/30 rounded-lg p-3">{patient.observations}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {lastAnalysis && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Último Tratamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {new Date(lastAnalysis.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Produto Utilizado</p>
                      <p className="font-medium">{getProductLabel(lastAnalysis.product_type)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dosagem Total</p>
                      <p className="font-medium text-primary">
                        {(lastAnalysis.procerus_dosage || 0) + (lastAnalysis.corrugator_dosage || 0)}U
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gênero</p>
                      <p className="font-medium">{getGenderLabel(lastAnalysis.patient_gender)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Força Muscular</p>
                      <p className="font-medium">{getMuscleStrengthLabel(lastAnalysis.muscle_strength_score)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Pele (Glogau)</p>
                      <p className="font-medium">{lastAnalysis.skin_type_glogau || 'Não avaliado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
