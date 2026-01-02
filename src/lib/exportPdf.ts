import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { InjectionPoint } from "@/components/Face3DViewer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientData {
  name: string;
  age?: string | number | null;
  observations?: string;
  gender?: string;
}

interface DosageTotals {
  procerus: number;
  corrugator: number;
  frontalis?: number;
  orbicularis_oculi?: number;
  nasalis?: number;
  orbicularis_oris?: number;
  mentalis?: number;
  masseter?: number;
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
  productType?: string;
  conversionFactor?: number;
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

const MUSCLE_REGIONS: Record<string, string[]> = {
  "Glabelar": ["procerus", "corrugator_left", "corrugator_right"],
  "Frontal": ["frontalis"],
  "Periorbital": ["orbicularis_oculi_left", "orbicularis_oculi_right"],
  "Nasal": ["nasalis"],
  "Perioral": ["orbicularis_oris", "levator_labii", "depressor_anguli"],
  "Terço Inferior": ["mentalis", "masseter"],
};

// Calculate dosages by region
function calculateDosagesByRegion(injectionPoints: InjectionPoint[]): Record<string, { points: number; dosage: number }> {
  const regionData: Record<string, { points: number; dosage: number }> = {};
  
  for (const [region, muscles] of Object.entries(MUSCLE_REGIONS)) {
    const regionPoints = injectionPoints.filter(p => muscles.includes(p.muscle));
    const totalDosage = regionPoints.reduce((sum, p) => sum + p.dosage, 0);
    if (regionPoints.length > 0) {
      regionData[region] = { points: regionPoints.length, dosage: totalDosage };
    }
  }
  
  return regionData;
}

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

  if (data.patient.gender) {
    pdf.text(`Gênero: ${data.patient.gender === 'feminino' ? 'Feminino' : 'Masculino'}`, margin, y);
    y += 5;
  }

  if (data.productType) {
    pdf.text(`Produto: ${data.productType}${data.conversionFactor && data.conversionFactor !== 1 ? ` (Fator: ${data.conversionFactor}x)` : ''}`, margin, y);
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

  // Resumo de Dosagem por Região
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Dosagem por Região Anatômica", margin, y);
  y += 8;

  const regionData = calculateDosagesByRegion(data.injectionPoints);
  const boxWidth = (contentWidth - 10) / 3;
  const boxHeight = 22;
  let boxX = margin;
  let boxCount = 0;

  const regionColors: Record<string, [number, number, number]> = {
    "Glabelar": [255, 243, 224],
    "Frontal": [254, 226, 226],
    "Periorbital": [252, 231, 243],
    "Nasal": [224, 242, 254],
    "Perioral": [236, 253, 245],
    "Terço Inferior": [243, 232, 255],
  };

  for (const [region, { points, dosage }] of Object.entries(regionData)) {
    if (boxCount > 0 && boxCount % 3 === 0) {
      boxX = margin;
      y += boxHeight + 5;
    }
    
    const bgColor = regionColors[region] || [245, 245, 245];
    pdf.setFillColor(...bgColor);
    pdf.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, "F");
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...primaryColor);
    pdf.text(`${dosage}U`, boxX + boxWidth / 2, y + 10, { align: "center" });
    
    pdf.setFontSize(8);
    pdf.setTextColor(...mutedColor);
    pdf.text(`${region} (${points} pts)`, boxX + boxWidth / 2, y + 17, { align: "center" });
    
    boxX += boxWidth + 5;
    boxCount++;
  }

  y += boxHeight + 10;

  // Total Geral Box
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(margin, y, contentWidth, 18, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(`TOTAL: ${data.totalDosage.total}U`, pageWidth / 2, y + 11, { align: "center" });
  
  y += 28;

  // Pontos de Aplicação Detalhados
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Pontos de Aplicação Detalhados", margin, y);
  y += 7;

  // Tabela de pontos
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  const colWidths = [55, 30, 35, 55];
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

// Export PDF with 3D map screenshot
export async function exportWithMapPdf(
  data: ExportData,
  mapElement: HTMLElement
): Promise<void> {
  // Capture the 3D map as image
  const canvas = await html2canvas(mapElement, {
    backgroundColor: "#f8fafc",
    scale: 2,
    useCORS: true,
    allowTaint: true,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Cores do tema
  const primaryColor: [number, number, number] = [184, 140, 80];
  const textColor: [number, number, number] = [60, 55, 50];
  const mutedColor: [number, number, number] = [120, 115, 110];

  // Header
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 25, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text("NeuroAesthetics", margin, 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Mapa de Aplicação 3D", margin, 21);

  let y = 32;

  // Patient info
  pdf.setTextColor(...textColor);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Paciente: ${data.patient.name}`, margin, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mutedColor);
  const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  pdf.text(`Data: ${dateStr}`, margin, y);
  
  if (data.productType) {
    pdf.text(`Produto: ${data.productType}`, margin + 60, y);
  }
  y += 10;

  // 3D Map Image
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const maxImgHeight = 110;
  const finalHeight = Math.min(imgHeight, maxImgHeight);

  // Border around image
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin - 1, y - 1, imgWidth + 2, finalHeight + 2, 3, 3, "S");

  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    margin,
    y,
    imgWidth,
    finalHeight
  );

  y += finalHeight + 8;

  // Dosage Summary Table by Region
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Resumo de Dosagem por Região", margin, y);
  y += 6;

  const regionData = calculateDosagesByRegion(data.injectionPoints);
  
  // Table header
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, 7, "F");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("Região", margin + 2, y + 5);
  pdf.text("Pontos", margin + 50, y + 5);
  pdf.text("Dosagem", margin + 80, y + 5);
  pdf.text("% do Total", margin + 115, y + 5);
  y += 8;

  pdf.setFont("helvetica", "normal");
  for (const [region, { points, dosage }] of Object.entries(regionData)) {
    const percentage = Math.round((dosage / data.totalDosage.total) * 100);
    pdf.text(region, margin + 2, y + 4);
    pdf.text(`${points}`, margin + 50, y + 4);
    pdf.text(`${dosage}U`, margin + 80, y + 4);
    pdf.text(`${percentage}%`, margin + 115, y + 4);
    
    // Draw percentage bar
    const barWidth = (percentage / 100) * 50;
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(margin + 135, y + 1, barWidth, 4, 1, 1, "F");
    
    y += 6;
  }

  // Total row
  pdf.setFillColor(...primaryColor);
  pdf.rect(margin, y, contentWidth, 8, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("TOTAL", margin + 2, y + 6);
  pdf.text(`${data.injectionPoints.length}`, margin + 50, y + 6);
  pdf.text(`${data.totalDosage.total}U`, margin + 80, y + 6);
  pdf.text("100%", margin + 115, y + 6);

  y += 15;

  // Clinical Notes (if space)
  if (y < 240 && data.clinicalNotes) {
    pdf.setTextColor(...textColor);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Observações Clínicas", margin, y);
    y += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const splitNotes = pdf.splitTextToSize(data.clinicalNotes, contentWidth);
    const notesHeight = Math.min(splitNotes.length, 4);
    pdf.text(splitNotes.slice(0, 4), margin, y);
    y += notesHeight * 4;
  }

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

  // Save PDF
  const fileName = `mapa-3d-${data.patient.name.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(fileName);
}
