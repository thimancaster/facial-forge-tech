import { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ArrowLeft, ArrowRight, Check, User, Camera, Crosshair, Loader2, FolderOpen, X, Sparkles, Brain, Eye, Tag, FileDown, Settings2, MousePointer, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture, PhotoType } from "./CameraCapture";
import { Face3DViewer, InjectionPoint } from "./Face3DViewer";
import { DosageSafetyAlert } from "./DosageSafetyAlert";
import { ProductSelector, TOXIN_PRODUCTS } from "./ProductSelector";
import { TreatmentTemplates } from "./TreatmentTemplates";
import { exportAnalysisPdf, exportWithMapPdf } from "@/lib/exportPdf";

interface PatientData {
  name: string;
  age: string;
  observations: string;
  gender: string;
}

interface PhotoData {
  resting: File | null;
  glabellar: File | null;
  frontal: File | null;
  smile: File | null;
  nasal: File | null;
  perioral: File | null;
  profile_left: File | null;
  profile_right: File | null;
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
  safetyZones?: Array<{
    region: string;
    reason: string;
    polygon_coordinates?: Array<{ x: number; y: number }>;
  }>;
}

const PHOTO_TYPES: { key: PhotoType; label: string; desc: string; required: boolean }[] = [
  { key: "resting", label: "Face em Repouso", desc: "Expressão neutra", required: true },
  { key: "glabellar", label: "Contração Glabelar", desc: "Expressão 'Bravo'", required: true },
  { key: "frontal", label: "Contração Frontal", desc: "Expressão 'Surpresa'", required: false },
  { key: "smile", label: "Sorriso", desc: "Sorriso natural", required: false },
  { key: "nasal", label: "Contração Nasal", desc: "Nariz contraído", required: false },
  { key: "perioral", label: "Projeção Labial", desc: "Boca projetada", required: false },
  { key: "profile_left", label: "Perfil Esquerdo", desc: "Virado para direita", required: false },
  { key: "profile_right", label: "Perfil Direito", desc: "Virado para esquerda", required: false },
];

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
    gender: "feminino",
  });
  
  const [photos, setPhotos] = useState<PhotoData>({
    resting: null,
    glabellar: null,
    frontal: null,
    smile: null,
    nasal: null,
    perioral: null,
    profile_left: null,
    profile_right: null,
  });
  
  // Treatment configuration
  const [selectedProduct, setSelectedProduct] = useState("botox");
  const [conversionFactor, setConversionFactor] = useState(1.0);
  const [muscleStrength, setMuscleStrength] = useState("medium");
  const [skinTypeGlogau, setSkinTypeGlogau] = useState("II");
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<InjectionPoint | null>(null);
  const [showMuscles, setShowMuscles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Ref for 3D viewer container (for screenshot export)
  const viewer3DRef = useRef<HTMLDivElement>(null);
  
  // Temporary photo URLs for preview and AI analysis
  const [photoUrls, setPhotoUrls] = useState<Record<PhotoType, string | null>>({
    resting: null,
    glabellar: null,
    frontal: null,
    smile: null,
    nasal: null,
    perioral: null,
    profile_left: null,
    profile_right: null,
  });

  const handlePhotoUpload = (type: PhotoType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotos(prev => ({ ...prev, [type]: file }));
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleProductChange = (productId: string, factor: number) => {
    setSelectedProduct(productId);
    setConversionFactor(factor);
  };

  const handleApplyTemplate = (points: any[], totalUnits: number) => {
    setAiAnalysis({
      injectionPoints: points,
      totalDosage: {
        procerus: points.filter(p => p.muscle === 'procerus').reduce((sum, p) => sum + p.dosage, 0),
        corrugator: points.filter(p => p.muscle.startsWith('corrugator')).reduce((sum, p) => sum + p.dosage, 0),
        frontalis: points.filter(p => p.muscle === 'frontalis').reduce((sum, p) => sum + p.dosage, 0),
        orbicularis_oculi: points.filter(p => p.muscle.startsWith('orbicularis_oculi')).reduce((sum, p) => sum + p.dosage, 0),
        total: totalUnits,
      },
      clinicalNotes: "Protocolo aplicado a partir de template pré-definido. Ajuste conforme avaliação clínica.",
      confidence: 0.9,
    });
    toast({
      title: "Template aplicado!",
      description: `${points.length} pontos de injeção configurados.`,
    });
  };

  const handleAnalyzePhotos = async () => {
    setIsAnalyzing(true);
    try {
      const imageUrls: string[] = [];
      
      for (const photoType of PHOTO_TYPES.map(p => p.key)) {
        const file = photos[photoType];
        if (file) {
          imageUrls.push(await fileToBase64(file));
        }
      }

      if (imageUrls.length === 0) {
        setAiAnalysis({
          injectionPoints: [
            { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: Math.round(8 * conversionFactor), notes: "Ponto central do procerus" },
            { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: Math.round(8 * conversionFactor), notes: "Corrugador medial esquerdo" },
            { id: "corr_l2", muscle: "corrugator_left", x: 28, y: 20, depth: "superficial", dosage: Math.round(6 * conversionFactor), notes: "Corrugador lateral esquerdo" },
            { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: Math.round(8 * conversionFactor), notes: "Corrugador medial direito" },
            { id: "corr_r2", muscle: "corrugator_right", x: 72, y: 20, depth: "superficial", dosage: Math.round(6 * conversionFactor), notes: "Corrugador lateral direito" },
          ],
          totalDosage: { procerus: Math.round(8 * conversionFactor), corrugator: Math.round(28 * conversionFactor), total: Math.round(36 * conversionFactor) },
          clinicalNotes: "Análise padrão para tratamento glabelar. Ajuste conforme massa muscular e histórico do paciente.",
          confidence: 0.7,
          safetyZones: [
            { region: "Margem Orbital", reason: "Evitar para prevenir ptose palpebral" },
            { region: "Área Infraorbital", reason: "Risco de difusão para músculos oculares" },
          ],
        });
        setStep(4);
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-face', {
        body: { 
          imageUrls,
          patientContext: {
            gender: patientData.gender,
            age: patientData.age ? parseInt(patientData.age) : null,
            muscleStrength,
            skinTypeGlogau,
          },
          productType: selectedProduct,
          conversionFactor,
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Erro na análise');
      }

      setAiAnalysis(data);
      setStep(4);
      
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
      
      setAiAnalysis({
        injectionPoints: [
          { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: Math.round(8 * conversionFactor), notes: "Ponto central do procerus" },
          { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: Math.round(8 * conversionFactor), notes: "Corrugador medial" },
          { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: Math.round(8 * conversionFactor), notes: "Corrugador medial" },
        ],
        totalDosage: { procerus: Math.round(8 * conversionFactor), corrugator: Math.round(16 * conversionFactor), total: Math.round(24 * conversionFactor) },
        clinicalNotes: "Análise padrão (fallback).",
        confidence: 0.5,
      });
      setStep(4);
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

  const dosagesByMuscle = useMemo(() => {
    if (!aiAnalysis) return {};
    
    return aiAnalysis.injectionPoints.reduce((acc, point) => {
      acc[point.muscle] = (acc[point.muscle] || 0) + point.dosage;
      return acc;
    }, {} as Record<string, number>);
  }, [aiAnalysis]);

  // Handler to add new injection point via click on 3D model
  const handleAddPoint = useCallback((pointData: Omit<InjectionPoint, 'id'>) => {
    if (!aiAnalysis) return;
    
    const newPoint: InjectionPoint = {
      ...pointData,
      id: `manual_${Date.now()}`,
      dosage: Math.round(4 * conversionFactor), // Use current conversion factor
    };
    
    const updatedPoints = [...aiAnalysis.injectionPoints, newPoint];
    
    // Recalculate totals
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
    
    const total = procerusTotal + corrugatorTotal + frontalisTotal + orbicularisTotal + 
      updatedPoints.filter(p => !["procerus", "frontalis"].includes(p.muscle) && 
        !p.muscle.startsWith("corrugator") && 
        !p.muscle.startsWith("orbicularis_oculi"))
        .reduce((sum, p) => sum + p.dosage, 0);
    
    setAiAnalysis({
      ...aiAnalysis,
      injectionPoints: updatedPoints,
      totalDosage: {
        procerus: procerusTotal,
        corrugator: corrugatorTotal,
        frontalis: frontalisTotal,
        orbicularis_oculi: orbicularisTotal,
        total
      }
    });

    toast({
      title: "Ponto adicionado!",
      description: `Novo ponto no ${pointData.muscle} com ${newPoint.dosage}U`,
    });
  }, [aiAnalysis, conversionFactor, toast]);

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

      const exportData = {
        patient: patientData,
        injectionPoints: aiAnalysis.injectionPoints,
        totalDosage: aiAnalysis.totalDosage,
        clinicalNotes: aiAnalysis.clinicalNotes,
        confidence: aiAnalysis.confidence,
        doctorName,
        clinicName,
        productType: TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.name,
        conversionFactor,
      };

      await exportAnalysisPdf(exportData);

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

  const handleExportPdfWith3D = async () => {
    if (!aiAnalysis || !viewer3DRef.current) return;
    
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

      const exportData = {
        patient: patientData,
        injectionPoints: aiAnalysis.injectionPoints,
        totalDosage: aiAnalysis.totalDosage,
        clinicalNotes: aiAnalysis.clinicalNotes,
        confidence: aiAnalysis.confidence,
        doctorName,
        clinicName,
        productType: TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.name,
        conversionFactor,
      };

      await exportWithMapPdf(exportData, viewer3DRef.current);

      toast({
        title: "PDF com Mapa 3D exportado!",
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

      // Upload all photos in parallel
      const photoKeys = Object.keys(photos) as PhotoType[];
      const uploadPromises = photoKeys.map(key => 
        photos[key] ? uploadPhotoToStorage(photos[key]!, user.id, patient.id, key) : Promise.resolve(null)
      );
      const uploadedUrls = await Promise.all(uploadPromises);

      const photoUrlsMap: Record<string, string | null> = {};
      photoKeys.forEach((key, index) => {
        photoUrlsMap[`${key}_photo_url`] = uploadedUrls[index];
      });

      const { error: analysisError } = await supabase
        .from('analyses')
        .insert({
          user_id: user.id,
          patient_id: patient.id,
          procerus_dosage: aiAnalysis?.totalDosage.procerus || 0,
          corrugator_dosage: aiAnalysis?.totalDosage.corrugator || 0,
          resting_photo_url: photoUrlsMap['resting_photo_url'],
          glabellar_photo_url: photoUrlsMap['glabellar_photo_url'],
          frontal_photo_url: photoUrlsMap['frontal_photo_url'],
          smile_photo_url: photoUrlsMap['smile_photo_url'],
          nasal_photo_url: photoUrlsMap['nasal_photo_url'],
          perioral_photo_url: photoUrlsMap['perioral_photo_url'],
          profile_left_photo_url: photoUrlsMap['profile_left_photo_url'],
          profile_right_photo_url: photoUrlsMap['profile_right_photo_url'],
          ai_injection_points: aiAnalysis?.injectionPoints as any || null,
          ai_clinical_notes: aiAnalysis?.clinicalNotes || null,
          ai_confidence: aiAnalysis?.confidence || null,
          product_type: TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.genericName || 'OnabotulinumtoxinA',
          conversion_factor: conversionFactor,
          patient_gender: patientData.gender,
          muscle_strength_score: muscleStrength,
          skin_type_glogau: skinTypeGlogau,
          safety_zones: aiAnalysis?.safetyZones as any || null,
          status: 'completed',
        });

      if (analysisError) throw analysisError;

      toast({
        title: "Análise salva com sucesso!",
        description: "Fotos, dosagens e análise de IA registradas.",
      });

      // Reset form
      setStep(1);
      setPatientData({ name: "", age: "", observations: "", gender: "feminino" });
      setPhotos({
        resting: null, glabellar: null, frontal: null, smile: null,
        nasal: null, perioral: null, profile_left: null, profile_right: null,
      });
      setPhotoUrls({
        resting: null, glabellar: null, frontal: null, smile: null,
        nasal: null, perioral: null, profile_left: null, profile_right: null,
      });
      setAiAnalysis(null);
      setSelectedPoint(null);
      setSelectedProduct("botox");
      setConversionFactor(1.0);
      setMuscleStrength("medium");
      
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
  const hasAnyPhoto = Object.values(photos).some(p => p !== null);

  const getPhotoLabel = (type: PhotoType): string => {
    return PHOTO_TYPES.find(p => p.key === type)?.label || type;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[
          { num: 1, label: "Paciente" },
          { num: 2, label: "Configuração" },
          { num: 3, label: "Fotos" },
          { num: 4, label: "Análise IA" }
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
            {i < 3 && (
              <div
                className={`w-16 h-1 mx-2 rounded ${
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
              <Label>Gênero</Label>
              <RadioGroup
                value={patientData.gender}
                onValueChange={(value) => setPatientData(prev => ({ ...prev, gender: value }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feminino" id="feminino" />
                  <Label htmlFor="feminino" className="cursor-pointer">Feminino</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="masculino" id="masculino" />
                  <Label htmlFor="masculino" className="cursor-pointer">Masculino</Label>
                </div>
              </RadioGroup>
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

      {/* Step 2: Treatment Configuration */}
      {step === 2 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-primary" />
              Configuração do Tratamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column - Product and settings */}
              <div className="space-y-6">
                <ProductSelector
                  selectedProduct={selectedProduct}
                  onProductChange={handleProductChange}
                />

                <div className="space-y-2">
                  <Label>Força Muscular</Label>
                  <Select value={muscleStrength} onValueChange={setMuscleStrength}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a força muscular" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa - Músculos finos</SelectItem>
                      <SelectItem value="medium">Média - Padrão</SelectItem>
                      <SelectItem value="high">Alta - Músculos fortes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Influencia o cálculo de dosagem (baixa: 0.8x, média: 1x, alta: 1.2x)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Pele (Escala de Glogau)</Label>
                  <Select value={skinTypeGlogau} onValueChange={setSkinTypeGlogau}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de pele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">Tipo I - Sem rugas (20-30 anos)</SelectItem>
                      <SelectItem value="II">Tipo II - Rugas em movimento (30-40 anos)</SelectItem>
                      <SelectItem value="III">Tipo III - Rugas em repouso (40-55 anos)</SelectItem>
                      <SelectItem value="IV">Tipo IV - Rugas severas (55+ anos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right column - Treatment templates */}
              <TreatmentTemplates
                patientGender={patientData.gender}
                muscleStrength={muscleStrength}
                conversionFactor={conversionFactor}
                onSelectTemplate={handleApplyTemplate}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => setStep(3)}>
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Photo Upload */}
      {step === 3 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-primary" />
              Fotos do Protocolo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {PHOTO_TYPES.map((photo) => (
                <div key={photo.key} className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">{photo.label}</Label>
                    {photo.required && <span className="text-red-500 text-xs">*</span>}
                  </div>
                  
                  <div className="relative h-32 border-2 border-dashed border-border/50 rounded-lg overflow-hidden bg-muted/20">
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
                          className="absolute top-1 right-1 w-6 h-6"
                          onClick={() => removePhoto(photo.key)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-2">
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">{photo.desc}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs px-2"
                      onClick={() => setCameraOpen(photo.key)}
                    >
                      <Camera className="w-3 h-3 mr-1" />
                      Câmera
                    </Button>
                    <label className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs px-2" asChild>
                        <span>
                          <FolderOpen className="w-3 h-3 mr-1" />
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
              <Button variant="outline" onClick={() => setStep(2)}>
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
          photoLabel={getPhotoLabel(cameraOpen)}
        />
      )}

      {/* Step 4: AI Analysis & 3D Visualization */}
      {step === 4 && aiAnalysis && (
        <div className="space-y-6">
          {/* AI Analysis Header */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">Análise de IA Concluída</h3>
                    <p className="text-sm text-muted-foreground">
                      {aiAnalysis.injectionPoints.length} pontos identificados • 
                      Confiança: <span className="font-medium text-primary">{Math.round(aiAnalysis.confidence * 100)}%</span>
                      {conversionFactor !== 1 && (
                        <span className="ml-2 text-amber-600">
                          • {TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.name}
                        </span>
                      )}
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <Crosshair className="w-5 h-5 text-primary" />
                    Modelo Anatômico 3D
                  </CardTitle>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="edit-mode"
                        checked={isEditMode}
                        onCheckedChange={setIsEditMode}
                      />
                      <Label htmlFor="edit-mode" className="text-xs flex items-center gap-1 cursor-pointer text-amber-600">
                        <MousePointer className="w-3.5 h-3.5" />
                        Editar
                      </Label>
                    </div>
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
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-danger-zones"
                        checked={showDangerZones}
                        onCheckedChange={setShowDangerZones}
                      />
                      <Label htmlFor="show-danger-zones" className="text-xs flex items-center gap-1 cursor-pointer text-red-500">
                        ⚠️ Zonas
                      </Label>
                    </div>
                  </div>
                </div>
                {isEditMode && (
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded px-3 py-1.5 border border-amber-200">
                    💡 Clique no modelo 3D para adicionar novos pontos de injeção. Dosagem base: {Math.round(4 * conversionFactor)}U ({TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.name})
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-2">
                <div ref={viewer3DRef} className="h-[500px] relative">
                  <Face3DViewer
                    injectionPoints={aiAnalysis.injectionPoints}
                    onPointClick={setSelectedPoint}
                    onAddPoint={handleAddPoint}
                    showMuscles={showMuscles}
                    showLabels={showLabels}
                    showDangerZones={showDangerZones}
                    safetyZones={aiAnalysis.safetyZones}
                    conversionFactor={conversionFactor}
                    isEditMode={isEditMode}
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
            <Button variant="outline" onClick={() => setStep(3)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleExportPdf}>
                <FileDown className="w-4 h-4 mr-2" />
                PDF Simples
              </Button>
              <Button variant="outline" onClick={handleExportPdfWith3D} className="border-primary/50 text-primary hover:bg-primary/10">
                <Image className="w-4 h-4 mr-2" />
                PDF com Mapa 3D
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
