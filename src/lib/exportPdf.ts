import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { InjectionPoint } from "@/components/Face3DViewer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientData {
  name: string;
  age?: string | number | null;
  observations?: string;
}

interface DosageTotals {
  procerus: number;
  corrugator: number;
  frontalis?: number;
  orbicularis_oculi?: number;
  total: number;
}

interface ExportData {
  patient: PatientData;
  injectionPoints: InjectionPoint[];
  totalDosage: DosageTotals;
  clinicalNotes: string;
  confidence: number;
  photoUrl?: string | null;
  clinicName?: string;
  doctorName?: string;
}

const MUSCLE_LABELS: Record<string, string> = {
  procerus: "Prócero",
  corrugator_left: "Corrugador Esquerdo",
  corrugator_right: "Corrugador Direito",
  frontalis: "Frontal",
  orbicularis_oculi_left: "Orbicular Olho Esq.",
  orbicularis_oculi_right: "Orbicular Olho Dir.",
  nasalis: "Nasal",
  levator_labii: "Levantador do Lábio",
  zygomaticus_major: "Zigomático Maior",
  zygomaticus_minor: "Zigomático Menor",
  orbicularis_oris: "Orbicular da Boca",
  depressor_anguli: "Depressor do Ângulo",
  mentalis: "Mentual",
  masseter: "Masseter",
};

export async function exportAnalysisPdf(data: ExportData): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Cores do tema
  const primaryColor: [number, number, number] = [184, 140, 80]; // Dourado
  const textColor: [number, number, number] = [60, 55, 50];
  const mutedColor: [number, number, number] = [120, 115, 110];

  // Header com branding
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 25, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text("NeuroAesthetics", margin, 15);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Análise de Toxina Botulínica", margin, 21);

  // Data no canto direito
  pdf.setFontSize(9);
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  pdf.text(dateStr, pageWidth - margin - pdf.getTextWidth(dateStr), 15);

  y = 35;

  // Informações do Paciente
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Dados do Paciente", margin, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Nome: ${data.patient.name}`, margin, y);
  y += 5;

  if (data.patient.age) {
    pdf.text(`Idade: ${data.patient.age} anos`, margin, y);
    y += 5;
  }

  if (data.patient.observations) {
    pdf.text(`Observações: ${data.patient.observations}`, margin, y);
    y += 5;
  }

  // Linha divisória
  y += 3;
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Resumo de Dosagem
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Resumo de Dosagem", margin, y);
  y += 8;

  // Caixas de dosagem
  const boxWidth = (contentWidth - 10) / 3;
  const boxHeight = 18;

  // Prócero
  pdf.setFillColor(255, 243, 224);
  pdf.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...primaryColor);
  pdf.text(`${data.totalDosage.procerus}U`, margin + boxWidth / 2, y + 10, { align: "center" });
  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  pdf.text("Prócero", margin + boxWidth / 2, y + 15, { align: "center" });

  // Corrugadores
  pdf.setFillColor(237, 233, 254);
  pdf.roundedRect(margin + boxWidth + 5, y, boxWidth, boxHeight, 2, 2, "F");
  pdf.setTextColor(139, 92, 246);
  pdf.setFontSize(14);
  pdf.text(`${data.totalDosage.corrugator}U`, margin + boxWidth + 5 + boxWidth / 2, y + 10, { align: "center" });
  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  pdf.text("Corrugadores", margin + boxWidth + 5 + boxWidth / 2, y + 15, { align: "center" });

  // Total
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(margin + (boxWidth + 5) * 2, y, boxWidth, boxHeight, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text(`${data.totalDosage.total}U`, margin + (boxWidth + 5) * 2 + boxWidth / 2, y + 10, { align: "center" });
  pdf.setFontSize(8);
  pdf.text("TOTAL", margin + (boxWidth + 5) * 2 + boxWidth / 2, y + 15, { align: "center" });

  y += boxHeight + 10;

  // Pontos de Aplicação
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Pontos de Aplicação", margin, y);
  y += 7;

  // Tabela de pontos
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  const colWidths = [60, 35, 35, 50];
  pdf.text("Músculo", margin, y);
  pdf.text("Dosagem", margin + colWidths[0], y);
  pdf.text("Profundidade", margin + colWidths[0] + colWidths[1], y);
  pdf.text("Observação", margin + colWidths[0] + colWidths[1] + colWidths[2], y);
  y += 2;

  pdf.setDrawColor(...mutedColor);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  pdf.setFont("helvetica", "normal");
  data.injectionPoints.forEach((point) => {
    if (y > 270) {
      pdf.addPage();
      y = margin;
    }

    const muscleLabel = MUSCLE_LABELS[point.muscle] || point.muscle;
    const depthLabel = point.depth === "deep" ? "Profundo" : "Superficial";

    pdf.setTextColor(...textColor);
    pdf.text(muscleLabel, margin, y);
    pdf.text(`${point.dosage}U`, margin + colWidths[0], y);
    pdf.text(depthLabel, margin + colWidths[0] + colWidths[1], y);
    
    if (point.notes) {
      const truncatedNotes = point.notes.length > 30 ? point.notes.substring(0, 27) + "..." : point.notes;
      pdf.setTextColor(...mutedColor);
      pdf.text(truncatedNotes, margin + colWidths[0] + colWidths[1] + colWidths[2], y);
    }

    y += 5;
  });

  y += 5;

  // Observações Clínicas
  if (data.clinicalNotes) {
    if (y > 250) {
      pdf.addPage();
      y = margin;
    }

    pdf.setTextColor(...textColor);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Observações Clínicas", margin, y);
    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const splitNotes = pdf.splitTextToSize(data.clinicalNotes, contentWidth);
    pdf.text(splitNotes, margin, y);
    y += splitNotes.length * 5 + 5;
  }

  // Confiança da IA
  pdf.setTextColor(...mutedColor);
  pdf.setFontSize(9);
  pdf.text(`Confiança da análise de IA: ${Math.round(data.confidence * 100)}%`, margin, y);

  // Footer
  const footerY = pdf.internal.pageSize.getHeight() - 10;
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  
  if (data.doctorName || data.clinicName) {
    const footerText = [data.doctorName, data.clinicName].filter(Boolean).join(" • ");
    pdf.text(footerText, margin, footerY);
  }

  pdf.text("Gerado por NeuroAesthetics", pageWidth - margin - pdf.getTextWidth("Gerado por NeuroAesthetics"), footerY);

  // Salvar PDF
  const fileName = `analise-${data.patient.name.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(fileName);
}

// Função para exportar elemento HTML como imagem no PDF (para o mapa 3D)
export async function exportWithMapPdf(
  data: ExportData,
  mapElement: HTMLElement
): Promise<void> {
  // Primeiro captura o mapa como imagem
  const canvas = await html2canvas(mapElement, {
    backgroundColor: "#ffffff",
    scale: 2,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  pdf.setFillColor(184, 140, 80);
  pdf.rect(0, 0, pageWidth, 20, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text("NeuroAesthetics - Mapa de Aplicação", margin, 13);

  let y = 30;

  // Info do paciente
  pdf.setTextColor(60, 55, 50);
  pdf.setFontSize(11);
  pdf.text(`Paciente: ${data.patient.name}`, margin, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setTextColor(120, 115, 110);
  pdf.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, margin, y);
  y += 10;

  // Imagem do mapa
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const maxImgHeight = 120;
  const finalHeight = Math.min(imgHeight, maxImgHeight);

  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    margin,
    y,
    imgWidth,
    finalHeight
  );

  y += finalHeight + 10;

  // Exportar resto usando a função principal
  await exportAnalysisPdf(data);
}
