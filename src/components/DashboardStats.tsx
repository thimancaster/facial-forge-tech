import { Users, FileText, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    title: "Total de Pacientes",
    value: "0",
    icon: Users,
    change: "Comece adicionando",
    changeType: "neutral" as const,
  },
  {
    title: "Análises Realizadas",
    value: "0",
    icon: FileText,
    change: "Este mês",
    changeType: "neutral" as const,
  },
  {
    title: "Taxa de Precisão",
    value: "98%",
    icon: TrendingUp,
    change: "Média do sistema",
    changeType: "positive" as const,
  },
  {
    title: "Última Análise",
    value: "-",
    icon: Calendar,
    change: "Nenhuma ainda",
    changeType: "neutral" as const,
  },
];

interface DashboardStatsProps {
  patientsCount?: number;
  analysesCount?: number;
}

export function DashboardStats({ patientsCount = 0, analysesCount = 0 }: DashboardStatsProps) {
  const dynamicStats = stats.map((stat, index) => {
    if (index === 0) return { ...stat, value: patientsCount.toString() };
    if (index === 1) return { ...stat, value: analysesCount.toString() };
    return stat;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {dynamicStats.map((stat) => (
        <Card key={stat.title} className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-medium text-foreground">{stat.value}</p>
                <p className={`text-xs mt-2 ${
                  stat.changeType === "positive" ? "text-green-600" : "text-muted-foreground"
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
