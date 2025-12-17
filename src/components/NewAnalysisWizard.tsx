import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowLeft, ArrowRight, Check, User, Camera, Crosshair, Loader2, FolderOpen, X, Sparkles, Brain, Eye, Tag, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture, PhotoType } from "./CameraCapture";
import { Face3DViewer, InjectionPoint } from "./Face3DViewer";
import { DosageSafetyAlert } from "./DosageSafetyAlert";
import { exportAnalysisPdf } from "@/lib/exportPdf";

interface PatientData {
  name: string;
  age: string;
  observations: string;
}

interface PhotoData {
  resting: File | null;
  glabellar: File | null;
  frontal: File | null;
}

interface AIAnalysis {
  injectionPoints: InjectionPoint[];
  totalDosage: {
    procerus: number;
    corrugator: number;
    frontalis?: number;
    orbicularis_oculi?: number;
    other?: number;
    total: number;
  };
  clinicalNotes: string;
  confidence: number;
}

export function NewAnalysisWizard() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState<PhotoType | null>(null);
  const { toast } = useToast();
  
  const [patientData, setPatientData] = useState<PatientData>({
    name: "",
    age: "",
    observations: "",
  });
  
  const [photos, setPhotos] = useState<PhotoData>({
    resting: null,
    glabellar: null,
    frontal: null,
  });
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<InjectionPoint | null>(null);
  const [showMuscles, setShowMuscles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  
  // Temporary photo URLs for preview and AI analysis
  const [photoUrls, setPhotoUrls] = useState<{
    resting: string | null;
    glabellar: string | null;
    frontal: string | null;
  }>({
    resting: null,
    glabellar: null,
    frontal: null,
  });

  const handlePhotoUpload = (type: PhotoType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotos(prev => ({ ...prev, [type]: file }));
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPhotoUrls(prev => ({ ...prev, [type]: url }));
    }
  };

  const handleCameraCapture = (type: PhotoType) => (file: File) => {
    setPhotos(prev => ({ ...prev, [type]: file }));
    const url = URL.createObjectURL(file);
    setPhotoUrls(prev => ({ ...prev, [type]: url }));
  };

  const removePhoto = (type: PhotoType) => {
    if (photoUrls[type]) {
      URL.revokeObjectURL(photoUrls[type]!);
    }
    setPhotos(prev => ({ ...prev, [type]: null }));
    setPhotoUrls(prev => ({ ...prev, [type]: null }));
  };

  const uploadPhotoToStorage = async (file: File, userId: string, patientId: string, photoType: PhotoType): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${patientId}/${photoType}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('patient-photos')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('patient-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Convert file to base64 for AI analysis
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // Call AI analysis when moving to step 3
  const handleAnalyzePhotos = async () => {
    setIsAnalyzing(true);
    try {
      // Convert photos to base64
      const imageUrls: string[] = [];
      
      if (photos.resting) {
        imageUrls.push(await fileToBase64(photos.resting));
      }
      if (photos.glabellar) {
        imageUrls.push(await fileToBase64(photos.glabellar));
      }
      if (photos.frontal) {
        imageUrls.push(await fileToBase64(photos.frontal));
      }

      if (imageUrls.length === 0) {
        // No photos, use default analysis
        setAiAnalysis({
          injectionPoints: [
            { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: 8, notes: "Ponto central do procerus" },
            { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial esquerdo" },
            { id: "corr_l2", muscle: "corrugator_left", x: 28, y: 20, depth: "superficial", dosage: 6, notes: "Corrugador lateral esquerdo" },
            { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial direito" },
            { id: "corr_r2", muscle: "corrugator_right", x: 72, y: 20, depth: "superficial", dosage: 6, notes: "Corrugador lateral direito" },
          ],
          totalDosage: { procerus: 8, corrugator: 28, total: 36 },
          clinicalNotes: "Análise padrão para tratamento glabelar. Ajuste conforme massa muscular e histórico do paciente.",
          confidence: 0.7
        });
        setStep(3);
        return;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('analyze-face', {
        body: { imageUrls }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Erro na análise');
      }

      setAiAnalysis(data);
      setStep(3);
      
      toast({
        title: "Análise concluída!",
        description: `${data.injectionPoints?.length || 0} pontos identificados com ${Math.round((data.confidence || 0) * 100)}% de confiança.`,
      });
      
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      toast({
        title: "Erro na análise de IA",
        description: "Usando análise padrão. " + (error.message || ''),
        variant: "destructive",
      });
      
      // Fallback to default
      setAiAnalysis({
        injectionPoints: [
          { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: 8, notes: "Ponto central do procerus" },
          { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial" },
          { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial" },
        ],
        totalDosage: { procerus: 8, corrugator: 16, total: 24 },
        clinicalNotes: "Análise padrão (fallback).",
        confidence: 0.5
      });
      setStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePointDosageChange = (pointId: string, newDosage: number) => {
    if (!aiAnalysis) return;
    
    const updatedPoints = aiAnalysis.injectionPoints.map(p => 
      p.id === pointId ? { ...p, dosage: newDosage } : p
    );
    
    const procerusTotal = updatedPoints
      .filter(p => p.muscle === "procerus")
      .reduce((sum, p) => sum + p.dosage, 0);
    
    const corrugatorTotal = updatedPoints
      .filter(p => p.muscle.startsWith("corrugator"))
      .reduce((sum, p) => sum + p.dosage, 0);

    const frontalisTotal = updatedPoints
      .filter(p => p.muscle === "frontalis")
      .reduce((sum, p) => sum + p.dosage, 0);

    const orbicularisTotal = updatedPoints
      .filter(p => p.muscle.startsWith("orbicularis_oculi"))
      .reduce((sum, p) => sum + p.dosage, 0);
    
    setAiAnalysis({
      ...aiAnalysis,
      injectionPoints: updatedPoints,
      totalDosage: {
        procerus: procerusTotal,
        corrugator: corrugatorTotal,
        frontalis: frontalisTotal,
        orbicularis_oculi: orbicularisTotal,
        total: procerusTotal + corrugatorTotal + frontalisTotal + orbicularisTotal
      }
    });
  };

  // Calcular dosagens por músculo para alertas de segurança
  const dosagesByMuscle = useMemo(() => {
    if (!aiAnalysis) return {};
    
    return aiAnalysis.injectionPoints.reduce((acc, point) => {
      acc[point.muscle] = (acc[point.muscle] || 0) + point.dosage;
      return acc;
    }, {} as Record<string, number>);
  }, [aiAnalysis]);

  // Exportar PDF
  const handleExportPdf = async () => {
    if (!aiAnalysis) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let doctorName = "";
      let clinicName = "";
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, clinic_name")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          doctorName = profile.full_name || "";
          clinicName = profile.clinic_name || "";
        }
      }

      await exportAnalysisPdf({
        patient: patientData,
        injectionPoints: aiAnalysis.injectionPoints,
        totalDosage: aiAnalysis.totalDosage,
        clinicalNotes: aiAnalysis.clinicalNotes,
        confidence: aiAnalysis.confidence,
        doctorName,
        clinicName,
      });

      toast({
        title: "PDF exportado!",
        description: "O arquivo foi salvo na pasta de downloads.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveAnalysis = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create patient first
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert({
          user_id: user.id,
          name: patientData.name,
          age: patientData.age ? parseInt(patientData.age) : null,
          observations: patientData.observations,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // Upload photos in parallel
      const uploadedUrls = await Promise.all([
        photos.resting ? uploadPhotoToStorage(photos.resting, user.id, patient.id, 'resting') : null,
        photos.glabellar ? uploadPhotoToStorage(photos.glabellar, user.id, patient.id, 'glabellar') : null,
        photos.frontal ? uploadPhotoToStorage(photos.frontal, user.id, patient.id, 'frontal') : null,
      ]);

      // Create analysis with photo URLs and AI data
      const { error: analysisError } = await supabase
        .from('analyses')
        .insert({
          user_id: user.id,
          patient_id: patient.id,
          procerus_dosage: aiAnalysis?.totalDosage.procerus || 0,
          corrugator_dosage: aiAnalysis?.totalDosage.corrugator || 0,
          resting_photo_url: uploadedUrls[0],
          glabellar_photo_url: uploadedUrls[1],
          frontal_photo_url: uploadedUrls[2],
          ai_injection_points: aiAnalysis?.injectionPoints as any || null,
          ai_clinical_notes: aiAnalysis?.clinicalNotes || null,
          ai_confidence: aiAnalysis?.confidence || null,
          status: 'completed',
        });

      if (analysisError) throw analysisError;

      toast({
        title: "Análise salva com sucesso!",
        description: "Fotos, dosagens e análise de IA registradas.",
      });

      // Reset form
      setStep(1);
      setPatientData({ name: "", age: "", observations: "" });
      setPhotos({ resting: null, glabellar: null, frontal: null });
      setPhotoUrls({ resting: null, glabellar: null, frontal: null });
      setAiAnalysis(null);
      setSelectedPoint(null);
      
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedStep1 = patientData.name.trim().length > 0;
  const canProceedStep2 = photos.resting || photos.glabellar || photos.frontal;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[
          { num: 1, label: "Paciente" },
          { num: 2, label: "Fotos" },
          { num: 3, label: "Análise IA" }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  step >= s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="w-5 h-5" /> : s.num}
              </div>
              <span className="text-xs mt-1 text-muted-foreground">{s.label}</span>
            </div>
            {i < 2 && (
              <div
                className={`w-20 h-1 mx-2 rounded ${
                  step > s.num ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Patient Data */}
      {step === 1 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              Dados do Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={patientData.name}
                  onChange={(e) => setPatientData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do paciente"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  value={patientData.age}
                  onChange={(e) => setPatientData(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="Ex: 35"
                  className="bg-muted/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={patientData.observations}
                onChange={(e) => setPatientData(prev => ({ ...prev, observations: e.target.value }))}
                placeholder="Notas clínicas, histórico relevante..."
                className="bg-muted/30 min-h-[100px]"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Photo Upload */}
      {step === 2 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-primary" />
              Fotos do Protocolo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { key: "resting" as PhotoType, label: "Face em Repouso", desc: "Expressão neutra" },
                { key: "glabellar" as PhotoType, label: "Contração Glabelar", desc: "Expressão 'Bravo'" },
                { key: "frontal" as PhotoType, label: "Contração Frontal", desc: "Expressão 'Surpresa'" },
              ].map((photo) => (
                <div key={photo.key} className="space-y-3">
                  <Label>{photo.label}</Label>
                  
                  {/* Photo Preview */}
                  <div className="relative h-40 border-2 border-dashed border-border/50 rounded-lg overflow-hidden bg-muted/20">
                    {photoUrls[photo.key] ? (
                      <>
                        <img
                          src={photoUrls[photo.key]!}
                          alt={photo.label}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 w-7 h-7"
                          onClick={() => removePhoto(photo.key)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">{photo.desc}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setCameraOpen(photo.key)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Tirar Foto
                    </Button>
                    <label className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <span>
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Arquivo
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload(photo.key)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleAnalyzePhotos} 
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Capture Modal */}
      {cameraOpen && (
        <CameraCapture
          isOpen={!!cameraOpen}
          onClose={() => setCameraOpen(null)}
          onCapture={handleCameraCapture(cameraOpen)}
          photoType={cameraOpen}
          photoLabel={
            cameraOpen === "resting" 
              ? "Face em Repouso" 
              : cameraOpen === "glabellar" 
                ? "Contração Glabelar" 
                : "Contração Frontal"
          }
        />
      )}

      {/* Step 3: AI Analysis & 3D Visualization */}
      {step === 3 && aiAnalysis && (
        <div className="space-y-6">
          {/* AI Analysis Header */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">Análise de IA Concluída</h3>
                    <p className="text-sm text-muted-foreground">
                      {aiAnalysis.injectionPoints.length} pontos identificados • 
                      Confiança: <span className="font-medium text-primary">{Math.round(aiAnalysis.confidence * 100)}%</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{aiAnalysis.totalDosage.total}U</p>
                  <p className="text-xs text-muted-foreground">Dosagem total recomendada</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* 3D Face Viewer - Larger */}
            <Card className="xl:col-span-3 border-border/50 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <Crosshair className="w-5 h-5 text-primary" />
                    Modelo Anatômico 3D
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-muscles"
                        checked={showMuscles}
                        onCheckedChange={setShowMuscles}
                      />
                      <Label htmlFor="show-muscles" className="text-xs flex items-center gap-1 cursor-pointer">
                        <Eye className="w-3.5 h-3.5" />
                        Músculos
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-labels"
                        checked={showLabels}
                        onCheckedChange={setShowLabels}
                      />
                      <Label htmlFor="show-labels" className="text-xs flex items-center gap-1 cursor-pointer">
                        <Tag className="w-3.5 h-3.5" />
                        Legendas
                      </Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[500px] relative">
                  <Face3DViewer
                    injectionPoints={aiAnalysis.injectionPoints}
                    onPointClick={setSelectedPoint}
                    showMuscles={showMuscles}
                    showLabels={showLabels}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dosage Controls & Details */}
            <div className="xl:col-span-2 space-y-4">
              {/* Clinical Notes */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Observações Clínicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiAnalysis.clinicalNotes}</p>
                </CardContent>
              </Card>

              {/* Dosage Summary */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumo de Dosagem</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                      <p className="text-xl font-bold text-amber-500">{aiAnalysis.totalDosage.procerus}U</p>
                      <p className="text-xs text-muted-foreground">Prócero</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                      <p className="text-xl font-bold text-violet-500">{aiAnalysis.totalDosage.corrugator}U</p>
                      <p className="text-xs text-muted-foreground">Corrugadores</p>
                    </div>
                    {(aiAnalysis.totalDosage.frontalis || 0) > 0 && (
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                        <p className="text-xl font-bold text-rose-500">{aiAnalysis.totalDosage.frontalis}U</p>
                        <p className="text-xs text-muted-foreground">Frontal</p>
                      </div>
                    )}
                    {(aiAnalysis.totalDosage.orbicularis_oculi || 0) > 0 && (
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                        <p className="text-xl font-bold text-pink-500">{aiAnalysis.totalDosage.orbicularis_oculi}U</p>
                        <p className="text-xs text-muted-foreground">Orbicular</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 text-center">
                    <p className="text-3xl font-bold text-foreground">{aiAnalysis.totalDosage.total}U</p>
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                  </div>
                </CardContent>
              </Card>

              {/* Injection Points List */}
              <Card className="border-border/50 max-h-[350px] overflow-hidden flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-base">Pontos de Aplicação ({aiAnalysis.injectionPoints.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 overflow-y-auto flex-1 pr-2">
                  {aiAnalysis.injectionPoints.map((point) => {
                    const muscleColors: Record<string, string> = {
                      procerus: '#F59E0B',
                      corrugator_left: '#8B5CF6',
                      corrugator_right: '#8B5CF6',
                      frontalis: '#F43F5E',
                      orbicularis_oculi_left: '#EC4899',
                      orbicularis_oculi_right: '#EC4899',
                      nasalis: '#06B6D4',
                      mentalis: '#10B981',
                    };
                    const muscleLabels: Record<string, string> = {
                      procerus: 'Prócero',
                      corrugator_left: 'Corrugador Esq.',
                      corrugator_right: 'Corrugador Dir.',
                      frontalis: 'Frontal',
                      orbicularis_oculi_left: 'Orbicular Olho Esq.',
                      orbicularis_oculi_right: 'Orbicular Olho Dir.',
                      nasalis: 'Nasal',
                      levator_labii: 'Levantador Lábio',
                      zygomaticus_major: 'Zigomático Maior',
                      zygomaticus_minor: 'Zigomático Menor',
                      orbicularis_oris: 'Orbicular Boca',
                      depressor_anguli: 'Depressor Ângulo',
                      mentalis: 'Mentual',
                      masseter: 'Masseter',
                    };

                    return (
                      <div 
                        key={point.id}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedPoint?.id === point.id 
                            ? 'border-primary bg-primary/10 shadow-md' 
                            : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
                        }`}
                        onClick={() => setSelectedPoint(point)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow" 
                              style={{ backgroundColor: muscleColors[point.muscle] || '#DC2626' }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {muscleLabels[point.muscle] || point.muscle}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {point.depth === 'deep' ? '🔵 Profundo' : '🟢 Superficial'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Input
                              type="number"
                              value={point.dosage}
                              onChange={(e) => handlePointDosageChange(point.id, parseInt(e.target.value) || 0)}
                              className="w-14 h-8 text-center text-sm font-semibold"
                              min={0}
                              max={50}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-muted-foreground font-medium">U</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Alertas de Segurança */}
          <DosageSafetyAlert 
            dosagesByMuscle={dosagesByMuscle} 
            totalDosage={aiAnalysis.totalDosage.total} 
          />

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportPdf}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={handleSaveAnalysis} disabled={isLoading} size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvar Análise
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
