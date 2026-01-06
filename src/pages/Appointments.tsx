import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { CalendarIcon, Clock, User, Mail, Trash2, Plus, CheckCircle, XCircle, Calendar as CalendarIconSolid, Loader2 } from "lucide-react";
import { format, isPast, isToday, isTomorrow, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  appointment_type: string;
  status: string;
  notes: string | null;
  patient_email: string | null;
  reminder_email: boolean;
  reminder_days_before: number[];
  patients?: { name: string; email?: string; phone?: string };
}

const TYPE_LABELS: Record<string, string> = {
  followup: "Retorno",
  new_session: "Nova Sessão",
  consultation: "Consulta",
  adjustment: "Ajuste",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Agendado", variant: "default" },
  completed: { label: "Realizado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  no_show: { label: "Não compareceu", variant: "outline" },
};

export default function Appointments() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patients (name, email, phone)
      `)
      .order("scheduled_date", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAppointments(data || []);
    }
    setIsLoading(false);
  }

  async function updateStatus(appointmentId: string, newStatus: string) {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Status atualizado!" });
      fetchAppointments();
    }
  }

  async function deleteAppointment(appointmentId: string) {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Agendamento excluído" });
      fetchAppointments();
    }
  }

  function getDateLabel(dateStr: string): string {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  }

  const upcomingAppointments = appointments.filter(a => 
    a.status === "scheduled" && !isPast(parseISO(a.scheduled_date))
  );
  
  const todayAppointments = appointments.filter(a => 
    a.status === "scheduled" && isToday(parseISO(a.scheduled_date))
  );

  const pastAppointments = appointments.filter(a => 
    a.status !== "scheduled" || isPast(parseISO(a.scheduled_date))
  );

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const date = parseISO(appointment.scheduled_date);
    const isUpcoming = !isPast(date) && appointment.status === "scheduled";
    const config = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;

    return (
      <Card className={`transition-all ${isUpcoming ? "border-primary/30" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{appointment.patients?.name || "Paciente"}</span>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {getDateLabel(appointment.scheduled_date)}
                </span>
                {appointment.scheduled_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {appointment.scheduled_time.substring(0, 5)}
                  </span>
                )}
                <Badge variant="outline" className="text-xs">
                  {TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}
                </Badge>
              </div>

              {appointment.patient_email && appointment.reminder_email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>Lembretes: {appointment.reminder_days_before?.join(", ")} dias antes</span>
                </div>
              )}

              {appointment.notes && (
                <p className="text-sm text-muted-foreground mt-2">{appointment.notes}</p>
              )}
            </div>

            {isUpcoming && (
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => updateStatus(appointment.id, "completed")}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => updateStatus(appointment.id, "cancelled")}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteAppointment(appointment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda de Retornos</h1>
          <p className="text-muted-foreground">Gerencie agendamentos e lembretes automáticos</p>
        </div>
        
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AppointmentScheduler 
              onScheduled={() => {
                setShowNewDialog(false);
                fetchAppointments();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Summary */}
      {todayAppointments.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIconSolid className="h-5 w-5 text-primary" />
              Hoje - {todayAppointments.length} agendamento{todayAppointments.length > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayAppointments.map(apt => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs for upcoming/past */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Próximos ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Histórico ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Nenhum agendamento futuro</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowNewDialog(true)}
                >
                  Agendar retorno
                </Button>
              </CardContent>
            </Card>
          ) : (
            upcomingAppointments.map(apt => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-4">
          {pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum histórico de agendamentos
              </CardContent>
            </Card>
          ) : (
            pastAppointments.slice(0, 20).map(apt => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
