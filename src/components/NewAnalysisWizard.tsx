import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ArrowLeft, ArrowRight, Check, User, Camera, Crosshair, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface DosageData {
  procerus: number;
  corrugator: number;
}

export function NewAnalysisWizard() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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
  
  const [dosage, setDosage] = useState<DosageData>({
    procerus: 10,
    corrugator: 10,
  });

  const handlePhotoUpload = (type: keyof PhotoData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotos(prev => ({ ...prev, [type]: file }));
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

      // Create analysis
      const { error: analysisError } = await supabase
        .from('analyses')
        .insert({
          user_id: user.id,
          patient_id: patient.id,
          procerus_dosage: dosage.procerus,
          corrugator_dosage: dosage.corrugator,
          status: 'completed',
        });

      if (analysisError) throw analysisError;

      toast({
        title: "Análise salva com sucesso!",
        description: "A dosagem foi registrada para o paciente.",
      });

      // Reset form
      setStep(1);
      setPatientData({ name: "", age: "", observations: "" });
      setPhotos({ resting: null, glabellar: null, frontal: null });
      setDosage({ procerus: 10, corrugator: 10 });
      
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
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-20 h-1 mx-2 rounded ${
                  step > s ? "bg-primary" : "bg-muted"
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
                { key: "resting" as const, label: "Face em Repouso", desc: "Expressão neutra" },
                { key: "glabellar" as const, label: "Contração Glabelar", desc: "Expressão 'Bravo'" },
                { key: "frontal" as const, label: "Contração Frontal", desc: "Expressão 'Surpresa'" },
              ].map((photo) => (
                <div key={photo.key} className="space-y-2">
                  <Label>{photo.label}</Label>
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
                    {photos[photo.key] ? (
                      <div className="text-center">
                        <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{photos[photo.key]?.name}</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{photo.desc}</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload(photo.key)}
                    />
                  </label>
                </div>
              ))}
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

      {/* Step 3: Analysis & Dosage */}
      {step === 3 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Crosshair className="w-5 h-5 text-primary" />
              Análise e Dosagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SVG Visualization */}
              <div className="relative bg-muted/30 rounded-xl p-4 aspect-square flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full max-w-xs">
                  {/* Face outline */}
                  <ellipse cx="100" cy="100" rx="70" ry="85" fill="none" stroke="hsl(var(--border))" strokeWidth="2"/>
                  
                  {/* Procerus muscle area */}
                  <path 
                    d="M90 60 Q100 55 110 60 L108 80 Q100 78 92 80 Z" 
                    fill="hsl(var(--primary))" 
                    fillOpacity="0.3" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="1.5"
                  />
                  <text x="100" y="70" textAnchor="middle" className="text-[8px] fill-primary font-medium">Procerus</text>
                  
                  {/* Corrugator muscles */}
                  <ellipse cx="70" cy="72" rx="15" ry="8" fill="hsl(var(--accent))" fillOpacity="0.3" stroke="hsl(var(--accent))" strokeWidth="1.5"/>
                  <ellipse cx="130" cy="72" rx="15" ry="8" fill="hsl(var(--accent))" fillOpacity="0.3" stroke="hsl(var(--accent))" strokeWidth="1.5"/>
                  <text x="70" y="75" textAnchor="middle" className="text-[6px] fill-accent font-medium">Corrugador</text>
                  <text x="130" y="75" textAnchor="middle" className="text-[6px] fill-accent font-medium">Corrugador</text>
                  
                  {/* Injection points */}
                  <circle cx="100" cy="65" r="4" fill="hsl(var(--primary))" stroke="white" strokeWidth="1"/>
                  <circle cx="70" cy="72" r="3" fill="hsl(var(--accent))" stroke="white" strokeWidth="1"/>
                  <circle cx="130" cy="72" r="3" fill="hsl(var(--accent))" stroke="white" strokeWidth="1"/>
                  
                  {/* Eyes reference */}
                  <ellipse cx="70" cy="90" rx="12" ry="6" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1"/>
                  <ellipse cx="130" cy="90" rx="12" ry="6" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1"/>
                </svg>
              </div>

              {/* Dosage Controls */}
              <div className="space-y-6">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"/>
                    Músculo Procerus
                  </h4>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={dosage.procerus}
                      onChange={(e) => setDosage(prev => ({ ...prev, procerus: parseInt(e.target.value) || 0 }))}
                      className="w-24 text-center bg-background"
                      min={0}
                      max={50}
                    />
                    <span className="text-muted-foreground">Unidades</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Recomendado: 8-12U</p>
                </div>

                <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent"/>
                    Músculos Corrugadores
                  </h4>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={dosage.corrugator}
                      onChange={(e) => setDosage(prev => ({ ...prev, corrugator: parseInt(e.target.value) || 0 }))}
                      className="w-24 text-center bg-background"
                      min={0}
                      max={50}
                    />
                    <span className="text-muted-foreground">Unidades (cada lado)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Recomendado: 8-15U por lado</p>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm font-medium text-foreground">
                    Total: {dosage.procerus + (dosage.corrugator * 2)} Unidades
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Procerus ({dosage.procerus}U) + Corrugadores ({dosage.corrugator}U × 2)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleSaveAnalysis} disabled={isLoading}>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
