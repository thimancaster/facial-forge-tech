import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Calendar, TrendingUp, Syringe, Clock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Analysis {
  id: string;
  created_at: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  product_type: string | null;
  ai_confidence: number | null;
  resting_photo_url: string | null;
  status: string | null;
}

interface TreatmentTimelineProps {
  analyses: Analysis[];
  isLoading?: boolean;
}

export function TreatmentTimeline({ analyses, isLoading = false }: TreatmentTimelineProps) {
  // Prepare timeline data
  const timelineData = useMemo(() => {
    return analyses
      .filter(a => a.status === 'completed')
      .map((analysis, index, arr) => {
        const totalDosage = (analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0);
        const date = parseISO(analysis.created_at);
        const prevAnalysis = arr[index + 1];
        const daysSincePrevious = prevAnalysis 
          ? differenceInDays(date, parseISO(prevAnalysis.created_at))
          : null;

        return {
          date: format(date, "dd/MM/yy"),
          fullDate: format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
          totalDosage,
          procerus: analysis.procerus_dosage || 0,
          corrugator: analysis.corrugator_dosage || 0,
          confidence: Math.round((analysis.ai_confidence || 0) * 100),
          daysSincePrevious,
          product: analysis.product_type,
          photoUrl: analysis.resting_photo_url,
          id: analysis.id,
        };
      })
      .reverse(); // Chronological order for chart
  }, [analyses]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (timelineData.length === 0) return null;

    const dosages = timelineData.map(d => d.totalDosage);
    const avgDosage = Math.round(dosages.reduce((a, b) => a + b, 0) / dosages.length);
    const minDosage = Math.min(...dosages);
    const maxDosage = Math.max(...dosages);
    
    // Calculate average interval
    const intervals = timelineData
      .filter(d => d.daysSincePrevious !== null)
      .map(d => d.daysSincePrevious as number);
    const avgInterval = intervals.length > 0 
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null;

    // Trend calculation (simple linear regression)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (timelineData.length >= 3) {
      const firstThird = dosages.slice(0, Math.floor(dosages.length / 3));
      const lastThird = dosages.slice(-Math.floor(dosages.length / 3));
      const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
      const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
      
      if (lastAvg > firstAvg * 1.1) trend = 'up';
      else if (lastAvg < firstAvg * 0.9) trend = 'down';
    }

    return {
      avgDosage,
      minDosage,
      maxDosage,
      avgInterval,
      trend,
      totalSessions: timelineData.length,
    };
  }, [timelineData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum tratamento registrado ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Syringe className="w-5 h-5 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{stats.avgDosage}U</p>
              <p className="text-xs text-muted-foreground">Dosagem Média</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
              <p className="text-2xl font-bold">
                {stats.minDosage}U - {stats.maxDosage}U
              </p>
              <p className="text-xs text-muted-foreground">Variação</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">
                {stats.avgInterval ? `${stats.avgInterval}d` : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Intervalo Médio</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Badge 
                variant={stats.trend === 'up' ? 'destructive' : stats.trend === 'down' ? 'default' : 'secondary'}
                className="mb-2"
              >
                {stats.trend === 'up' ? '↑ Aumentando' : stats.trend === 'down' ? '↓ Reduzindo' : '→ Estável'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Tendência de Dosagem</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dosage Evolution Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Evolução de Dosagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickFormatter={(v) => `${v}U`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(label, payload) => {
                    const data = payload?.[0]?.payload;
                    return data?.fullDate || label;
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      totalDosage: 'Total',
                      procerus: 'Prócero',
                      corrugator: 'Corrugadores',
                    };
                    return [`${value}U`, labels[name] || name];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalDosage"
                  name="Total"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="procerus"
                  name="Prócero"
                  stroke="#10B981"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="corrugator"
                  name="Corrugadores"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Visual Timeline with Photos */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Linha do Tempo Visual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {timelineData.map((item, index) => (
                <div 
                  key={item.id}
                  className="flex-shrink-0 w-[140px] relative"
                >
                  {/* Connector line */}
                  {index < timelineData.length - 1 && (
                    <div className="absolute top-[45px] left-[70px] w-full h-0.5 bg-primary/30" />
                  )}
                  
                  {/* Photo/placeholder */}
                  <div className="w-[90px] h-[90px] mx-auto rounded-full border-2 border-primary/50 overflow-hidden bg-muted/30 relative z-10">
                    {item.photoUrl ? (
                      <img 
                        src={item.photoUrl} 
                        alt={`Sessão ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="text-center mt-3">
                    <p className="text-xs font-medium">{item.date}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {item.totalDosage}U
                    </Badge>
                    {item.daysSincePrevious && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        +{item.daysSincePrevious} dias
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default TreatmentTimeline;
