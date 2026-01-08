import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Image, Trash2, Eye, User, Calendar, Syringe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface AnalysesGalleryProps {
  analyses: Analysis[];
  onRefresh: () => void;
}

export function AnalysesGallery({ analyses, onRefresh }: AnalysesGalleryProps) {
  const [viewingAnalysis, setViewingAnalysis] = useState<Analysis | null>(null);
  const [deletingAnalysis, setDeletingAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deletingAnalysis) return;
    setIsLoading(true);

    const { error } = await supabase
      .from("analyses")
      .delete()
      .eq("id", deletingAnalysis.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Análise excluída com sucesso!" });
      setDeletingAnalysis(null);
      onRefresh();
    }
  };

  const getTotalDosage = (analysis: Analysis) => {
    const procerus = analysis.procerus_dosage || 0;
    const corrugator = analysis.corrugator_dosage || 0;
    // corrugator já é o total bilateral, não multiplicar por 2
    return procerus + corrugator;
  };

  if (analyses.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Image className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma análise realizada ainda.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Inicie uma nova análise para ver os resultados aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyses.map((analysis) => (
          <Card key={analysis.id} className="border-border/50 overflow-hidden hover:border-primary/30 transition-colors">
            {/* Photo Preview */}
            <div className="aspect-video bg-muted/30 relative">
              {analysis.resting_photo_url ? (
                <img
                  src={analysis.resting_photo_url}
                  alt="Foto de repouso"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                  onClick={() => setViewingAnalysis(analysis)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm text-destructive"
                  onClick={() => setDeletingAnalysis(analysis)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {analysis.patients?.name || "Paciente"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(analysis.created_at).toLocaleDateString("pt-BR")}
                </span>
                <span className="flex items-center gap-1">
                  <Syringe className="w-3 h-3" />
                  {getTotalDosage(analysis)}U total
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewingAnalysis} onOpenChange={() => setViewingAnalysis(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {viewingAnalysis?.patients?.name || "Análise"}
            </DialogTitle>
          </DialogHeader>
          
          {viewingAnalysis && (
            <div className="space-y-6">
              {/* Photos Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { url: viewingAnalysis.resting_photo_url, label: "Repouso" },
                  { url: viewingAnalysis.glabellar_photo_url, label: "Glabelar" },
                  { url: viewingAnalysis.frontal_photo_url, label: "Frontal" },
                ].map((photo, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="aspect-square bg-muted/30 rounded-lg overflow-hidden">
                      {photo.url ? (
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center text-muted-foreground">{photo.label}</p>
                  </div>
                ))}
              </div>

              {/* Dosage Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-sm text-muted-foreground">Procerus</p>
                  <p className="text-2xl font-medium text-foreground">
                    {viewingAnalysis.procerus_dosage || 0}U
                  </p>
                </div>
                <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                  <p className="text-sm text-muted-foreground">Corrugadores</p>
                  <p className="text-2xl font-medium text-foreground">
                    {viewingAnalysis.corrugator_dosage || 0}U × 2
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Total aplicado</p>
                <p className="text-3xl font-medium text-foreground">
                  {getTotalDosage(viewingAnalysis)} Unidades
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Análise realizada em{" "}
                {new Date(viewingAnalysis.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAnalysis} onOpenChange={() => setDeletingAnalysis(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Análise</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.
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
    </>
  );
}
