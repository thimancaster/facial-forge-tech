import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, User, Calendar, FileText, Activity, 
  ClipboardList, TrendingUp, Camera, Loader2, AlertCircle,
  PlusCircle, Phone, Mail, Heart, Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PatientTreatmentHistory } from "@/components/PatientTreatmentHistory";
import { BeforeAfterComparison } from "@/components/BeforeAfterComparison";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Patient {
  id: string;
  name: string;
  age: number | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  skin_type?: string | null;
  allergies?: string | null;
  medical_history?: string | null;
  preferred_product?: string | null;
  photo_url?: string | null;
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
  smile_photo_url?: string | null;
  nasal_photo_url?: string | null;
  perioral_photo_url?: string | null;
  profile_left_photo_url?: string | null;
  profile_right_photo_url?: string | null;
}

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
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

  const handleStartNewAnalysis = () => {
    navigate(`/dashboard/new-analysis?patientId=${patientId}`);
  };

  const getAllPhotosFromAnalysis = (analysis: Analysis) => {
    const photos: { url: string; label: string }[] = [];
    if (analysis.resting_photo_url) photos.push({ url: analysis.resting_photo_url, label: 'Repouso' });
    if (analysis.glabellar_photo_url) photos.push({ url: analysis.glabellar_photo_url, label: 'Glabelar' });
    if (analysis.frontal_photo_url) photos.push({ url: analysis.frontal_photo_url, label: 'Frontal' });
    if (analysis.smile_photo_url) photos.push({ url: analysis.smile_photo_url, label: 'Sorriso' });
    if (analysis.nasal_photo_url) photos.push({ url: analysis.nasal_photo_url, label: 'Nasal' });
    if (analysis.perioral_photo_url) photos.push({ url: analysis.perioral_photo_url, label: 'Perioral' });
    if (analysis.profile_left_photo_url) photos.push({ url: analysis.profile_left_photo_url, label: 'Perfil E' });
    if (analysis.profile_right_photo_url) photos.push({ url: analysis.profile_right_photo_url, label: 'Perfil D' });
    return photos;
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
            <Button onClick={() => navigate('/dashboard/patients')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Pacientes
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/patients')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-4">
                {/* Patient Avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {lastAnalysis?.resting_photo_url ? (
                    <img 
                      src={lastAnalysis.resting_photo_url} 
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {patient.age && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {patient.age} anos
                      </span>
                    )}
                    {patient.gender && (
                      <Badge variant="outline" className="text-xs">
                        {getGenderLabel(patient.gender)}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Desde {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {totalSessions} {totalSessions === 1 ? 'sessão' : 'sessões'}
              </Badge>
              <Button onClick={handleStartNewAnalysis}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Análise
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Activity className="w-5 h-5 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{completedSessions}</p>
              <p className="text-xs text-muted-foreground">Tratamentos Completos</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
              <p className="text-2xl font-bold">{totalUnitsUsed}U</p>
              <p className="text-xs text-muted-foreground">Unidades Totais</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-5 h-5 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">
                {lastAnalysis ? getProductLabel(lastAnalysis.product_type).split('®')[0] : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Último Produto</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 hover:shadow-md transition-shadow">
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
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="history">Evolução</TabsTrigger>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
            <TabsTrigger value="info">Dados</TabsTrigger>
          </TabsList>

          {/* Sessions Tab - All Photos Gallery */}
          <TabsContent value="sessions" className="space-y-4">
            {analyses.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhuma sessão registrada.</p>
                  <Button onClick={handleStartNewAnalysis}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Iniciar Primeira Análise
                  </Button>
                </CardContent>
              </Card>
            ) : (
              analyses.map((analysis, index) => {
                const photos = getAllPhotosFromAnalysis(analysis);
                return (
                  <Card key={analysis.id} className="border-border/50 overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                            {totalSessions - index}
                          </span>
                          <span>Sessão de {new Date(analysis.created_at).toLocaleDateString('pt-BR')}</span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                            {analysis.status === 'completed' ? 'Concluída' : 'Rascunho'}
                          </Badge>
                          <Badge variant="outline" className="bg-primary/10">
                            {(analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0)}U Total
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {/* Photo Gallery */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
                          {photos.map((photo, pIndex) => (
                            <div 
                              key={pIndex}
                              className="relative aspect-square cursor-pointer group"
                              onClick={() => setSelectedPhoto(photo.url)}
                            >
                              <img 
                                src={photo.url} 
                                alt={photo.label}
                                className="w-full h-full object-cover rounded-lg border border-border group-hover:border-primary transition-colors"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 rounded-b-lg">
                                <p className="text-[10px] text-white text-center truncate">{photo.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Dosage Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Produto</p>
                          <p className="font-medium text-sm">{getProductLabel(analysis.product_type)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Prócero</p>
                          <p className="font-medium text-sm">{analysis.procerus_dosage || 0}U</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Corrugadores</p>
                          <p className="font-medium text-sm">{analysis.corrugator_dosage || 0}U</p>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-bold text-sm text-primary">
                            {(analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0)}U
                          </p>
                        </div>
                      </div>

                      {/* AI Notes */}
                      {analysis.ai_clinical_notes && (
                        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                          <p className="text-xs text-accent font-medium mb-1 flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            Notas Clínicas (IA)
                          </p>
                          <p className="text-sm text-foreground">{analysis.ai_clinical_notes}</p>
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
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
                );
              })
            )}
          </TabsContent>

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
                  <Button onClick={handleStartNewAnalysis}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Iniciar Nova Análise
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            {analyses.length >= 2 ? (
              <BeforeAfterComparison patientId={patient.id} />
            ) : (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Comparativo não disponível</h3>
                  <p className="text-muted-foreground mb-4">
                    São necessárias pelo menos 2 sessões para gerar comparativo.
                  </p>
                  {analyses.length === 0 && (
                    <Button onClick={handleStartNewAnalysis}>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Iniciar Primeira Análise
                    </Button>
                  )}
                </CardContent>
              </Card>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Nome Completo</p>
                    <p className="font-medium">{patient.name}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Idade</p>
                    <p className="font-medium">{patient.age ? `${patient.age} anos` : 'Não informada'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Gênero</p>
                    <p className="font-medium">{getGenderLabel(patient.gender || null)}</p>
                  </div>
                  {patient.phone && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Telefone
                      </p>
                      <p className="font-medium">{patient.phone}</p>
                    </div>
                  )}
                  {patient.email && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </p>
                      <p className="font-medium text-sm truncate">{patient.email}</p>
                    </div>
                  )}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Data de Cadastro</p>
                    <p className="font-medium">
                      {new Date(patient.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Additional Medical Info */}
                {(patient.skin_type || patient.allergies || patient.medical_history) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {patient.skin_type && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Tipo de Pele</p>
                          <p className="font-medium">{patient.skin_type}</p>
                        </div>
                      )}
                      {patient.preferred_product && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Produto Preferido</p>
                          <p className="font-medium">{getProductLabel(patient.preferred_product)}</p>
                        </div>
                      )}
                    </div>
                    {patient.allergies && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p className="text-xs text-destructive font-medium mb-1">⚠️ Alergias</p>
                        <p className="text-sm">{patient.allergies}</p>
                      </div>
                    )}
                    {patient.medical_history && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Histórico Médico</p>
                        <p className="text-sm">{patient.medical_history}</p>
                      </div>
                    )}
                  </>
                )}

                {patient.observations && (
                  <>
                    <Separator />
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{patient.observations}</p>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {new Date(lastAnalysis.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Produto</p>
                      <p className="font-medium">{getProductLabel(lastAnalysis.product_type)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Dosagem Total</p>
                      <p className="font-medium text-primary">
                        {(lastAnalysis.procerus_dosage || 0) + (lastAnalysis.corrugator_dosage || 0)}U
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Força Muscular</p>
                      <p className="font-medium">{getMuscleStrengthLabel(lastAnalysis.muscle_strength_score)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Photo Lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Visualização</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="p-4">
              <img 
                src={selectedPhoto} 
                alt="Foto ampliada"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}