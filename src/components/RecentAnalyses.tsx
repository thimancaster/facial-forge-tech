import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, User, Syringe, ArrowRight, Image as ImageIcon } from "lucide-react";
import { SecureImage } from "@/components/SecureImage";

interface Analysis {
  id: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  created_at: string;
  resting_photo_url: string | null;
  patients?: {
    name: string;
  };
}

interface RecentAnalysesProps {
  analyses: Analysis[];
}

export function RecentAnalyses({ analyses }: RecentAnalysesProps) {
  const navigate = useNavigate();

  if (analyses.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Análises Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground text-sm">Nenhuma análise realizada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const getTotalDosage = (analysis: Analysis) => {
    const procerus = analysis.procerus_dosage || 0;
    const corrugator = analysis.corrugator_dosage || 0;
    return procerus + corrugator * 2;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Análises Recentes
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/protocols")}>
          Ver todas
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyses.slice(0, 5).map((analysis) => (
          <div
            key={analysis.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0">
              <SecureImage
                src={analysis.resting_photo_url}
                alt="Análise"
                className="w-full h-full"
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                }
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate flex items-center gap-1">
                <User className="w-3 h-3" />
                {analysis.patients?.name || "Paciente"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(analysis.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>

            {/* Dosage Badge */}
            <div className="flex items-center gap-1 text-sm text-primary">
              <Syringe className="w-3 h-3" />
              {getTotalDosage(analysis)}U
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
