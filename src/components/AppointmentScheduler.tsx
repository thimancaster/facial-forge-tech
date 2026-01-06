import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, Mail, User, Check, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface AppointmentSchedulerProps {
  patientId?: string;
  analysisId?: string;
  onScheduled?: () => void;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

const APPOINTMENT_TYPES = [
  { value: "followup", label: "Retorno / Follow-up" },
  { value: "new_session", label: "Nova Sessão" },
  { value: "consultation", label: "Consulta" },
  { value: "adjustment", label: "Ajuste" },
];

const REMINDER_OPTIONS = [
  { value: 1, label: "1 dia antes" },
  { value: 3, label: "3 dias antes" },
  { value: 7, label: "7 dias antes" },
  { value: 14, label: "14 dias antes" },
];

export function AppointmentScheduler({ patientId, analysisId, onScheduled }: AppointmentSchedulerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 14));
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [appointmentType, setAppointmentType] = useState("followup");
  const [patientEmail, setPatientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderEmail, setReminderEmail] = useState(true);
  const [reminderDays, setReminderDays] = useState<number[]>([7, 1]);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient?.email) {
        setPatientEmail(patient.email);
      }
    }
  }, [selectedPatientId, patients]);

  async function fetchPatients() {
    const { data } = await supabase
      .from("patients")
      .select("id, name, email, phone")
      .order("name");
    
    if (data) {
      setPatients(data);
    }
  }

  function toggleReminderDay(day: number) {
    setReminderDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => b - a)
    );
  }

  async function handleSubmit() {
    if (!selectedPatientId || !selectedDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um paciente e uma data.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const scheduledDate = format(selectedDate, "yyyy-MM-dd");
      
      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          user_id: userData.user.id,
          patient_id: selectedPatientId,
          analysis_id: analysisId || null,
          appointment_type: appointmentType,
          scheduled_date: scheduledDate,
          scheduled_time: selectedTime,
          reminder_email: reminderEmail,
          reminder_days_before: reminderDays,
          patient_email: patientEmail || null,
          notes: notes || null,
          status: "scheduled",
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create reminders if email is enabled
      if (reminderEmail && patientEmail && appointment) {
        const reminders = reminderDays.map(days => {
          const reminderDate = addDays(selectedDate, -days);
          reminderDate.setHours(9, 0, 0, 0); // 9:00 AM
          
          return {
            appointment_id: appointment.id,
            reminder_type: "email",
            scheduled_for: reminderDate.toISOString(),
            status: "pending",
          };
        });

        await supabase.from("appointment_reminders").insert(reminders);
      }

      toast({
        title: "Agendamento criado!",
        description: `Retorno agendado para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} às ${selectedTime}.`,
      });

      onScheduled?.();
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Erro ao agendar",
        description: "Não foi possível criar o agendamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Agendar Retorno
        </CardTitle>
        <CardDescription>
          Configure o agendamento de retorno e lembretes automáticos por email.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Patient Selection */}
        <div className="space-y-2">
          <Label>Paciente</Label>
          {patientId ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedPatient?.name || "Carregando..."}</span>
            </div>
          ) : (
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Appointment Type */}
        <div className="space-y-2">
          <Label>Tipo de Agendamento</Label>
          <Select value={appointmentType} onValueChange={setAppointmentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date and Time */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Data</Label>
            <div className="border rounded-lg p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                locale={ptBR}
                className="rounded-md"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_SLOTS.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedDate && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium text-primary">Resumo do Agendamento</p>
                <p className="text-lg font-semibold mt-1">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-muted-foreground">às {selectedTime}</p>
              </div>
            )}
          </div>
        </div>

        {/* Email Reminder */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              id="reminder-email"
              checked={reminderEmail}
              onCheckedChange={(checked) => setReminderEmail(!!checked)}
            />
            <div className="flex-1">
              <Label htmlFor="reminder-email" className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                Enviar lembretes por email
              </Label>
            </div>
          </div>

          {reminderEmail && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Email do paciente</Label>
                <Input
                  type="email"
                  placeholder="paciente@email.com"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Enviar lembretes</Label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map(option => (
                    <Badge
                      key={option.value}
                      variant={reminderDays.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleReminderDay(option.value)}
                    >
                      {reminderDays.includes(option.value) && <Check className="h-3 w-3 mr-1" />}
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Observações (opcional)</Label>
          <Textarea
            placeholder="Adicione observações sobre o retorno..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading || !selectedPatientId || !selectedDate}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Agendando...
            </>
          ) : (
            <>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Agendar Retorno
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
