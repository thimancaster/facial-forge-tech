import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ArrowLeft, ArrowRight, Check, User, Camera, Crosshair, Loader2, FolderOpen, X, Sparkles, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture, PhotoType } from "./CameraCapture";
import { Face3DViewer, InjectionPoint } from "./Face3DViewer";

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
    
    setAiAnalysis({
      ...aiAnalysis,
      injectionPoints: updatedPoints,
      totalDosage: {
        procerus: procerusTotal,
        corrugator: corrugatorTotal,
        total: procerusTotal + corrugatorTotal
      }
    });
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
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Análise de IA Concluída</h3>
                    <p className="text-sm text-muted-foreground">
                      {aiAnalysis.injectionPoints.length} pontos identificados • 
                      Confiança: {Math.round(aiAnalysis.confidence * 100)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{aiAnalysis.totalDosage.total}U</p>
                  <p className="text-xs text-muted-foreground">Total recomendado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3D Face Viewer */}
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <Crosshair className="w-5 h-5 text-primary" />
                  Visualização 3D
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[400px] relative">
                  <Face3DViewer
                    injectionPoints={aiAnalysis.injectionPoints}
                    onPointClick={setSelectedPoint}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dosage Controls & Details */}
            <div className="space-y-4">
              {/* Clinical Notes */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Observações Clínicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{aiAnalysis.clinicalNotes}</p>
                </CardContent>
              </Card>

              {/* Injection Points List */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pontos de Aplicação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiAnalysis.injectionPoints.map((point) => (
                    <div 
                      key={point.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedPoint?.id === point.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border/50 hover:border-border'
                      }`}
                      onClick={() => setSelectedPoint(point)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ 
                              backgroundColor: point.muscle === 'procerus' ? '#F59E0B' : '#8B5CF6' 
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {point.muscle.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {point.depth === 'deep' ? 'Profundo' : 'Superficial'}
                              {point.notes && ` • ${point.notes}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={point.dosage}
                            onChange={(e) => handlePointDosageChange(point.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center text-sm"
                            min={0}
                            max={30}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-muted-foreground">U</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Dosage Summary */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="py-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-primary">{aiAnalysis.totalDosage.procerus}U</p>
                      <p className="text-xs text-muted-foreground">Procerus</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-accent">{aiAnalysis.totalDosage.corrugator}U</p>
                      <p className="text-xs text-muted-foreground">Corrugadores</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{aiAnalysis.totalDosage.total}U</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handleSaveAnalysis} disabled={isLoading} size="lg">
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
      )}
    </div>
  );
}
