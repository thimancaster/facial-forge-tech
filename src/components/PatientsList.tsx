import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, Edit2, Trash2, User, Calendar, FileText, Loader2, Eye, 
  PlusCircle, Image, Activity, Phone, Mail 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  name: string;
  age: number | null;
  observations: string | null;
  created_at: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  photo_url?: string | null;
}

interface Analysis {
  id: string;
  created_at: string;
  status: string | null;
  resting_photo_url: string | null;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
}

interface PatientsListProps {
  patients: Patient[];
  onRefresh: () => void;
}

export function PatientsList({ patients, onRefresh }: PatientsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [patientAnalyses, setPatientAnalyses] = useState<Record<string, Analysis | null>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const [editForm, setEditForm] = useState({
    name: "",
    age: "",
    observations: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    // Fetch last analysis for each patient
    const fetchLastAnalyses = async () => {
      const patientIds = patients.map(p => p.id);
      if (patientIds.length === 0) return;
      
      const { data } = await supabase
        .from("analyses")
        .select("id, patient_id, created_at, status, resting_photo_url, procerus_dosage, corrugator_dosage")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });
      
      if (data) {
        const analysesMap: Record<string, Analysis | null> = {};
        patientIds.forEach(id => {
          const lastAnalysis = data.find(a => a.patient_id === id);
          analysesMap[id] = lastAnalysis || null;
        });
        setPatientAnalyses(analysesMap);
      }
    };
    
    fetchLastAnalyses();
  }, [patients]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setEditForm({
      name: patient.name,
      age: patient.age?.toString() || "",
      observations: patient.observations || "",
      email: patient.email || "",
      phone: patient.phone || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;
    setIsLoading(true);

    const { error } = await supabase
      .from("patients")
      .update({
        name: editForm.name,
        age: editForm.age ? parseInt(editForm.age) : null,
        observations: editForm.observations,
        email: editForm.email || null,
        phone: editForm.phone || null,
      })
      .eq("id", editingPatient.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Paciente atualizado com sucesso!" });
      setEditingPatient(null);
      onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!deletingPatient) return;
    setIsLoading(true);

    // Delete related analyses first
    await supabase.from("analyses").delete().eq("patient_id", deletingPatient.id);

    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", deletingPatient.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Paciente excluído com sucesso!" });
      setDeletingPatient(null);
      onRefresh();
    }
  };

  const handleStartNewAnalysis = (patientId: string) => {
    navigate(`/dashboard/new-analysis?patientId=${patientId}`);
  };

  const getGenderBadge = (gender: string | null) => {
    if (!gender) return null;
    return gender === 'masculino' ? 'M' : 'F';
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-muted/30"
        />
      </div>

      {/* Patients List */}
      {filteredPatients.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum paciente encontrado."
                : "Nenhum paciente cadastrado ainda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPatients.map((patient) => {
            const lastAnalysis = patientAnalyses[patient.id];
            const totalDosage = lastAnalysis 
              ? (lastAnalysis.procerus_dosage || 0) + (lastAnalysis.corrugator_dosage || 0)
              : 0;
            
            return (
              <Card 
                key={patient.id} 
                className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/patient/${patient.id}`)}
              >
                <CardContent className="p-0">
                  {/* Photo Header */}
                  <div className="relative h-32 bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
                    {lastAnalysis?.resting_photo_url ? (
                      <img 
                        src={lastAnalysis.resting_photo_url} 
                        alt={patient.name}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    
                    {/* Gender Badge */}
                    {patient.gender && (
                      <Badge 
                        variant="secondary" 
                        className="absolute top-2 right-2 text-xs"
                      >
                        {getGenderBadge(patient.gender)}
                      </Badge>
                    )}
                    
                    {/* Sessions Count */}
                    {lastAnalysis && (
                      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium flex items-center gap-1">
                        <Activity className="w-3 h-3 text-primary" />
                        {totalDosage}U
                      </div>
                    )}
                  </div>
                  
                  {/* Patient Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {patient.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          {patient.age && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {patient.age}a
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {new Date(patient.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    {(patient.email || patient.phone) && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </span>
                        )}
                        {patient.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {patient.email}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Last Treatment */}
                    {lastAnalysis && (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 mb-3">
                        Última sessão: {new Date(lastAnalysis.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStartNewAnalysis(patient.id)}
                      >
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Nova Consulta
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/patient/${patient.id}`)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(patient)}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingPatient(patient)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPatient} onOpenChange={() => setEditingPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-age">Idade</Label>
                <Input
                  id="edit-age"
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, age: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="paciente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obs">Observações</Label>
              <Textarea
                id="edit-obs"
                value={editForm.observations}
                onChange={(e) => setEditForm((prev) => ({ ...prev, observations: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPatient(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoading || !editForm.name.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPatient} onOpenChange={() => setDeletingPatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingPatient?.name}</strong>? Esta ação
              não pode ser desfeita e todas as análises deste paciente serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}