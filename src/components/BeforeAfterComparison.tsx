import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InjectionPoint } from "./Face3DViewer";
import { Json } from "@/integrations/supabase/types";

interface Analysis {
  id: string;
  created_at: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  ai_injection_points: InjectionPoint[] | null;
  ai_clinical_notes: string | null;
  ai_confidence: number | null;
  frontal_photo_url: string | null;
  resting_photo_url: string | null;
  glabellar_photo_url: string | null;
  patient_id: string;
}

interface Patient {
  id: string;
  name: string;
  age: number | null;
}

interface BeforeAfterComparisonProps {
  patientId?: string;
  onClose?: () => void;
}

function parseInjectionPoints(data: Json | null): InjectionPoint[] | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data as unknown as InjectionPoint[];
  }
  return null;
}

export function BeforeAfterComparison({ patientId, onClose }: BeforeAfterComparisonProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(patientId || null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [beforeAnalysis, setBeforeAnalysis] = useState<Analysis | null>(null);
  const [afterAnalysis, setAfterAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar pacientes
  useEffect(() => {
    async function fetchPatients() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("patients")
        .select("id, name, age")
        .eq("user_id", user.id)
        .order("name");

      if (data) setPatients(data);
      setIsLoading(false);
    }
    fetchPatients();
  }, []);

  // Carregar análises do paciente selecionado
  useEffect(() => {
    async function fetchAnalyses() {
      if (!selectedPatient) {
        setAnalyses([]);
        return;
      }

      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("patient_id", selectedPatient)
        .order("created_at", { ascending: false });

      if (data) {
        const parsed = data.map(a => ({
          ...a,
          ai_injection_points: parseInjectionPoints(a.ai_injection_points),
        }));
        setAnalyses(parsed);
        
        // Auto-selecionar as duas últimas análises se existirem
        if (parsed.length >= 2) {
          setAfterAnalysis(parsed[0]);
          setBeforeAnalysis(parsed[1]);
        } else if (parsed.length === 1) {
          setAfterAnalysis(parsed[0]);
          setBeforeAnalysis(null);
        }
      }
    }
    fetchAnalyses();
  }, [selectedPatient]);

  const calculateDosageChange = (before: number | null, after: number | null) => {
    if (before === null || after === null) return { change: 0, percentage: 0 };
    const change = after - before;
    const percentage = before > 0 ? Math.round((change / before) * 100) : 0;
    return { change, percentage };
  };

  const totalBefore = (beforeAnalysis?.procerus_dosage || 0) + (beforeAnalysis?.corrugator_dosage || 0);
  const totalAfter = (afterAnalysis?.procerus_dosage || 0) + (afterAnalysis?.corrugator_dosage || 0);
  const totalChange = calculateDosageChange(totalBefore, totalAfter);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Comparativo de Evolução
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de Paciente */}
        {!patientId && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Selecionar Paciente
            </label>
            <Select value={selectedPatient || ""} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.age ? `(${p.age} anos)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Seletores de Análises */}
        {selectedPatient && analyses.length >= 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Antes (Análise Anterior)
              </label>
              <Select
                value={beforeAnalysis?.id || ""}
                onValueChange={(id) => setBeforeAnalysis(analyses.find((a) => a.id === id) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Depois (Análise Atual)
              </label>
              <Select
                value={afterAnalysis?.id || ""}
                onValueChange={(id) => setAfterAnalysis(analyses.find((a) => a.id === id) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Comparação Visual */}
        {beforeAnalysis && afterAnalysis && (
          <>
            {/* Fotos Antes/Depois */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <p className="text-sm font-medium mb-2 text-center">Antes</p>
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {format(new Date(beforeAnalysis.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted/20 border border-border/50">
                  {beforeAnalysis.resting_photo_url ? (
                    <img
                      src={beforeAnalysis.resting_photo_url}
                      alt="Antes"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-primary" />
              </div>

              <div className="col-span-1">
                <p className="text-sm font-medium mb-2 text-center">Depois</p>
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {format(new Date(afterAnalysis.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted/20 border border-border/50">
                  {afterAnalysis.resting_photo_url ? (
                    <img
                      src={afterAnalysis.resting_photo_url}
                      alt="Depois"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comparação de Dosagens */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Evolução das Dosagens</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Prócero */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Prócero</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {beforeAnalysis.procerus_dosage || 0}U → {afterAnalysis.procerus_dosage || 0}U
                    </span>
                    <DosageChangeBadge 
                      {...calculateDosageChange(beforeAnalysis.procerus_dosage, afterAnalysis.procerus_dosage)} 
                    />
                  </div>
                </div>

                {/* Corrugadores */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Corrugadores</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {beforeAnalysis.corrugator_dosage || 0}U → {afterAnalysis.corrugator_dosage || 0}U
                    </span>
                    <DosageChangeBadge 
                      {...calculateDosageChange(beforeAnalysis.corrugator_dosage, afterAnalysis.corrugator_dosage)} 
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      {totalBefore}U → {totalAfter}U
                    </span>
                    <DosageChangeBadge {...totalChange} />
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            {(beforeAnalysis.ai_clinical_notes || afterAnalysis.ai_clinical_notes) && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Observações Clínicas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-xs font-medium mb-1">Antes</p>
                    <p className="text-sm text-muted-foreground">
                      {beforeAnalysis.ai_clinical_notes || "Sem observações"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-xs font-medium mb-1">Depois</p>
                    <p className="text-sm text-muted-foreground">
                      {afterAnalysis.ai_clinical_notes || "Sem observações"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Estado vazio */}
        {selectedPatient && analyses.length < 2 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>É necessário pelo menos 2 análises para comparação.</p>
            <p className="text-sm mt-1">
              Este paciente possui {analyses.length} análise{analyses.length !== 1 ? "s" : ""}.
            </p>
          </div>
        )}

        {!selectedPatient && !patientId && (
          <div className="py-8 text-center text-muted-foreground">
            Selecione um paciente para visualizar a evolução.
          </div>
        )}

        {onClose && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DosageChangeBadge({ change, percentage }: { change: number; percentage: number }) {
  if (change === 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="w-3 h-3" />
        0%
      </Badge>
    );
  }

  if (change > 0) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600 bg-amber-500/10">
        <TrendingUp className="w-3 h-3" />
        +{percentage}%
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 bg-green-500/10">
      <TrendingDown className="w-3 h-3" />
      {percentage}%
    </Badge>
  );
}
