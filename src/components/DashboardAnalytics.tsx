import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Users, FileText, Calendar, Activity, Target, Syringe } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Analysis {
  id: string;
  created_at: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  ai_injection_points: any;
  product_type: string | null;
  patient_gender: string | null;
  status: string | null;
  patients?: {
    name: string;
    gender: string | null;
  };
}

const COLORS = ['#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#10B981', '#F43F5E', '#6366F1', '#84CC16'];

const MUSCLE_LABELS: Record<string, string> = {
  procerus: 'Prócero',
  corrugator_left: 'Corrugador Esq.',
  corrugator_right: 'Corrugador Dir.',
  corrugator: 'Corrugadores',
  frontalis: 'Frontal',
  orbicularis_oculi_left: 'Orbicular Esq.',
  orbicularis_oculi_right: 'Orbicular Dir.',
  orbicularis_oculi: 'Orbicular Olhos',
  nasalis: 'Nasal',
  mentalis: 'Mentual',
  masseter: 'Masseter',
};

export function DashboardAnalytics() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("6");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, timeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    const startDate = subMonths(new Date(), parseInt(timeRange));

    const [analysesRes, patientsRes] = await Promise.all([
      supabase
        .from("analyses")
        .select("id, created_at, procerus_dosage, corrugator_dosage, ai_injection_points, product_type, patient_gender, status, patients(name, gender)")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true }),
      supabase
        .from("patients")
        .select("id, name, gender, created_at")
        .order("created_at", { ascending: true }),
    ]);

    setAnalyses((analysesRes.data as Analysis[]) || []);
    setPatients(patientsRes.data || []);
    setIsLoading(false);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAnalyses = analyses.length;
    const totalPatients = patients.length;
    const completedAnalyses = analyses.filter(a => a.status === 'completed').length;
    
    // Calculate total dosage
    const totalDosage = analyses.reduce((sum, a) => {
      const procerus = a.procerus_dosage || 0;
      const corrugator = a.corrugator_dosage || 0;
      const points = Array.isArray(a.ai_injection_points) ? a.ai_injection_points : [];
      const pointsTotal = points.reduce((s: number, p: any) => s + (p.dosage || 0), 0);
      return sum + procerus + corrugator + (pointsTotal > 0 ? pointsTotal : 0);
    }, 0);

    // Average dosage per analysis
    const avgDosage = totalAnalyses > 0 ? Math.round(totalDosage / totalAnalyses) : 0;

    // Gender distribution
    const femalePatients = patients.filter(p => p.gender === 'feminino').length;
    const malePatients = patients.filter(p => p.gender === 'masculino').length;

    return {
      totalAnalyses,
      totalPatients,
      completedAnalyses,
      totalDosage,
      avgDosage,
      femalePatients,
      malePatients,
    };
  }, [analyses, patients]);

  // Monthly evolution data
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; analyses: number; dosage: number; patients: number }> = {};
    
    // Initialize months
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      months[key] = {
        month: format(date, 'MMM/yy', { locale: ptBR }),
        analyses: 0,
        dosage: 0,
        patients: 0,
      };
    }

    // Count analyses per month
    analyses.forEach(analysis => {
      const key = format(parseISO(analysis.created_at), 'yyyy-MM');
      if (months[key]) {
        months[key].analyses++;
        months[key].dosage += (analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0);
      }
    });

    // Count new patients per month
    patients.forEach(patient => {
      const key = format(parseISO(patient.created_at), 'yyyy-MM');
      if (months[key]) {
        months[key].patients++;
      }
    });

    return Object.values(months);
  }, [analyses, patients, timeRange]);

  // Dosage by region (radar chart)
  const dosageByRegion = useMemo(() => {
    const regions: Record<string, number> = {
      'Glabela': 0,
      'Frontal': 0,
      'Periorbital': 0,
      'Nasal': 0,
      'Perioral': 0,
      'Mentual': 0,
    };

    analyses.forEach(analysis => {
      // Add procerus/corrugator to Glabela
      regions['Glabela'] += (analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0);

      // Parse injection points
      const points = Array.isArray(analysis.ai_injection_points) ? analysis.ai_injection_points : [];
      points.forEach((point: any) => {
        const muscle = point.muscle?.toLowerCase() || '';
        const dosage = point.dosage || 0;

        if (muscle.includes('frontal')) {
          regions['Frontal'] += dosage;
        } else if (muscle.includes('orbicular') && (muscle.includes('oculi') || muscle.includes('olho'))) {
          regions['Periorbital'] += dosage;
        } else if (muscle.includes('nasal')) {
          regions['Nasal'] += dosage;
        } else if (muscle.includes('oris') || muscle.includes('depressor') || muscle.includes('labial')) {
          regions['Perioral'] += dosage;
        } else if (muscle.includes('mentalis') || muscle.includes('mentual')) {
          regions['Mentual'] += dosage;
        }
      });
    });

    return Object.entries(regions).map(([region, dosage]) => ({
      region,
      dosage: Math.round(dosage),
      fullMark: Math.max(...Object.values(regions)) * 1.2,
    }));
  }, [analyses]);

  // Product distribution (pie chart)
  const productDistribution = useMemo(() => {
    const products: Record<string, number> = {};
    
    analyses.forEach(analysis => {
      const product = analysis.product_type || 'OnabotulinumtoxinA';
      products[product] = (products[product] || 0) + 1;
    });

    return Object.entries(products).map(([name, value]) => ({
      name: name.includes('Ona') ? 'Botox®' : 
            name.includes('Abo') ? 'Dysport®' : 
            name.includes('Inco') ? 'Xeomin®' : name,
      value,
    }));
  }, [analyses]);

  // Top muscles treated (bar chart)
  const muscleDistribution = useMemo(() => {
    const muscles: Record<string, number> = {};
    
    analyses.forEach(analysis => {
      // Add legacy dosages
      if (analysis.procerus_dosage) {
        muscles['procerus'] = (muscles['procerus'] || 0) + analysis.procerus_dosage;
      }
      if (analysis.corrugator_dosage) {
        muscles['corrugator'] = (muscles['corrugator'] || 0) + analysis.corrugator_dosage;
      }

      // Parse injection points
      const points = Array.isArray(analysis.ai_injection_points) ? analysis.ai_injection_points : [];
      points.forEach((point: any) => {
        const muscle = point.muscle || 'unknown';
        const baseMuscle = muscle.replace(/_left|_right|_esq|_dir/gi, '');
        muscles[baseMuscle] = (muscles[baseMuscle] || 0) + (point.dosage || 0);
      });
    });

    return Object.entries(muscles)
      .map(([muscle, dosage]) => ({
        muscle: MUSCLE_LABELS[muscle] || muscle,
        dosage: Math.round(dosage),
      }))
      .sort((a, b) => b.dosage - a.dosage)
      .slice(0, 6);
  }, [analyses]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground">Métricas e tendências do seu consultório</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-violet-500/10 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Análises</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalAnalyses}</p>
                <p className="text-xs text-violet-600 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  No período selecionado
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalPatients}</p>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {stats.femalePatients}♀ / {stats.malePatients}♂
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dosagem Total</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalDosage}U</p>
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Syringe className="w-3 h-3" />
                  Aplicadas no período
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média por Sessão</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.avgDosage}U</p>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Dosagem média
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorAnalyses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="analyses" name="Análises" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAnalyses)" />
                <Area type="monotone" dataKey="patients" name="Novos Pacientes" stroke="#06B6D4" fillOpacity={1} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dosage by Region - Radar */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Dosagem por Região Facial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dosageByRegion}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="region" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Radar 
                  name="Dosagem (U)" 
                  dataKey="dosage" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.4} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Muscle Distribution - Bar */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Syringe className="w-4 h-4 text-primary" />
              Top Músculos Tratados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={muscleDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="muscle" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}U`, 'Dosagem Total']}
                />
                <Bar dataKey="dosage" radius={[0, 4, 4, 0]}>
                  {muscleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Distribution - Pie */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Produtos Utilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={productDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {productDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
