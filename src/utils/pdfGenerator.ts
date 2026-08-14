import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, Exam, MedicalRecord, Medication, Allergy, Vaccine, MetricEntry } from '../types';

export interface PDFSectionOptions {
  includeProfile: boolean;
  includeAllergies: boolean;
  includeMedications: boolean;
  includeExams: boolean;
  includeMedicalRecords: boolean;
  includeMetrics: boolean;
  includeVaccines: boolean;
  customDoctorNote?: string;
}

export interface HealthReportData {
  userProfile: UserProfile;
  exams: Exam[];
  medicalRecords: MedicalRecord[];
  medications: Medication[];
  allergies: Allergy[];
  vaccines?: Vaccine[];
  metrics?: MetricEntry[];
  options?: Partial<PDFSectionOptions>;
}

export function generateHealthSummaryPDF(data: HealthReportData): jsPDF {
  const { 
    userProfile, 
    exams = [], 
    medicalRecords = [], 
    medications = [], 
    allergies = [],
    vaccines = [],
    metrics = [],
    options = {}
  } = data;

  const config: PDFSectionOptions = {
    includeProfile: true,
    includeAllergies: true,
    includeMedications: true,
    includeExams: true,
    includeMedicalRecords: true,
    includeMetrics: true,
    includeVaccines: true,
    customDoctorNote: '',
    ...options
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Brand Accent line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Title & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('HEALTH.AI', margin, 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('Your Health. Organized. For Life.', margin, 23);

  // Document Title on the right
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Dossiê & Resumo Clínico de Saúde', pageWidth - margin, 16, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  const emissionDate = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  doc.text(`Emitido em: ${emissionDate}`, pageWidth - margin, 22, { align: 'right' });
  const secureId = `HAI-${userProfile.cpf.replace(/[^0-9]/g, '').slice(0, 6)}-${Date.now().toString().slice(-4)}`;
  doc.text(`ID de Validação: ${secureId}`, pageWidth - margin, 27, { align: 'right' });

  let currentY = 44;

  // 2. Patient Profile Box
  if (config.includeProfile) {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Paciente: ${userProfile.name}`, margin + 4, currentY + 7);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`CPF: ${userProfile.cpf}`, margin + 4, currentY + 13);
    doc.text(`Idade: ${userProfile.age} anos • Altura: ${userProfile.heightCm} cm • Peso: ${userProfile.weightKg} kg`, margin + 4, currentY + 19);

    doc.text(`Tipo Sanguíneo: ${userProfile.bloodType}`, margin + 85, currentY + 13);
    doc.text(`Gênero: ${userProfile.gender}`, margin + 85, currentY + 19);

    doc.text(`Plano: HealthAI ${userProfile.plan}`, margin + 130, currentY + 13);
    const emergencyInfo = userProfile.emergencyContact 
      ? `${userProfile.emergencyContact.name} (${userProfile.emergencyContact.phone})` 
      : 'Não cadastrado';
    doc.text(`Emergência: ${emergencyInfo}`, margin + 130, currentY + 19);

    currentY += 32;
  }

  // Optional Note for the Doctor
  if (config.customDoctorNote && config.customDoctorNote.trim().length > 0) {
    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(204, 251, 241); // teal-100
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 14, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110); // teal-700
    doc.text('Mensagem / Objetivo Clínico informado pelo Paciente:', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitNote = doc.splitTextToSize(config.customDoctorNote.trim(), pageWidth - (margin * 2) - 8);
    doc.text(splitNote, margin + 4, currentY + 9.5);

    currentY += 18;
  }

  // Section Counter
  let sectionIndex = 1;

  // 3. Section: Alergias & Alertas Médicos Críticos
  if (config.includeAllergies) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`${sectionIndex++}. Alergias Conhecidas & Alertas Médicos Críticos`, margin, currentY);
    currentY += 3;

    const allergyData = allergies.map(a => [
      a.allergen,
      a.category,
      a.severity,
      a.reaction
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Alérgeno / Substância', 'Categoria', 'Severidade', 'Reação / Sintomas Clínicos']],
      body: allergyData.length > 0 ? allergyData : [['Nenhuma alergia grave relatada', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. Section: Medicamentos em Uso Ativo
  if (config.includeMedications) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionIndex++}. Medicamentos e Suplementos em Uso Ativo`, margin, currentY);
    currentY += 3;

    const activeMeds = medications.filter(m => m.active);
    const medicationData = activeMeds.map(m => [
      m.name,
      m.dosage,
      m.frequency,
      m.timesOfDay.join(', '),
      m.purpose,
      m.prescribedBy
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Medicamento', 'Dosagem', 'Frequência', 'Horários', 'Finalidade', 'Prescritor']],
      body: medicationData.length > 0 ? medicationData : [['Nenhum medicamento ativo', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. Section: Últimos Exames e Resultados Laboratoriais
  if (config.includeExams) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionIndex++}. Exames Recentes e Indicadores Laboratoriais`, margin, currentY);
    currentY += 3;

    const examData: any[] = [];
    exams.slice(0, 6).forEach(e => {
      const mainValues = e.values.map(v => `${v.name}: ${v.value} ${v.unit} (Ref: ${v.referenceRange})`).join(' | ');
      examData.push([
        e.date,
        e.title,
        e.laboratory,
        e.statusAlert,
        mainValues || e.summary
      ]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Exame', 'Laboratório', 'Status', 'Valores / Resumo']],
      body: examData.length > 0 ? examData : [['-', 'Nenhum exame cadastrado', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 28 },
        3: { cellWidth: 18 },
        4: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Section: Indicadores Clínicos & Métricas Recentes
  if (config.includeMetrics && metrics.length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionIndex++}. Histórico Recente de Métricas e Sinais Vitais`, margin, currentY);
    currentY += 3;

    // Grab latest reading for key metrics
    const metricTypes: Record<string, string> = {
      pressao_arterial: 'Pressão Arterial',
      glicemia: 'Glicemia em Jejum',
      colesterol_ldl: 'Colesterol LDL',
      colesterol_total: 'Colesterol Total',
      colesterol_hdl: 'Colesterol HDL',
      vitamina_d: 'Vitamina D (25-OH)',
      peso: 'Peso Corporal',
      frequencia_cardiaca: 'Frequência Cardíaca'
    };

    const metricsData: any[] = [];
    Object.keys(metricTypes).forEach(typeKey => {
      const entries = metrics.filter(m => m.type === typeKey).sort((a, b) => b.date.localeCompare(a.date));
      if (entries.length > 0) {
        const latest = entries[0];
        const valStr = latest.valueSecondary !== undefined 
          ? `${latest.value}/${latest.valueSecondary} ${latest.unit}`
          : `${latest.value} ${latest.unit}`;
        
        metricsData.push([
          metricTypes[typeKey],
          valStr,
          latest.date,
          latest.notes || 'Aferição de rotina'
        ]);
      }
    });

    if (metricsData.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Parâmetro Clínico', 'Último Valor Registrado', 'Data da Aferição', 'Contexto / Observações']],
        body: metricsData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // 7. Section: Histórico de Consultas & Procedimentos Médicos
  if (config.includeMedicalRecords) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionIndex++}. Histórico Clínico, Consultas e Procedimentos`, margin, currentY);
    currentY += 3;

    const recordData = medicalRecords.slice(0, 6).map(r => [
      r.date,
      r.type,
      `${r.doctorName} (${r.specialty})`,
      r.facility,
      r.notes
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Tipo', 'Médico / Especialidade', 'Local / Hospital', 'Resumo Clínico']],
      body: recordData.length > 0 ? recordData : [['-', '-', 'Nenhum histórico registrado', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 8. Section: Carteira de Vacinação & Imunizações
  if (config.includeVaccines && vaccines.length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionIndex++}. Carteira de Vacinação & Imunizações`, margin, currentY);
    currentY += 3;

    const vaccineData = vaccines.map(v => [
      v.name,
      v.doseInfo,
      v.status,
      v.dateAdministered || (v.dueDate ? `Previsto: ${v.dueDate}` : '-'),
      v.location || 'Posto de Saúde / Clínica'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Vacina / Imunizante', 'Dose', 'Status', 'Data Aplicação / Previsão', 'Local de Aplicação']],
      body: vaccineData,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Check space for disclaimer footer
  if (currentY > pageHeight - 25) {
    doc.addPage();
    currentY = 20;
  }

  // 9. Medical Disclaimer & Footer Box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    'Nota de Isenção e Ética HealthAI: Este documento é um resumo informativo e cronológico gerado a partir dos dados inseridos pelo paciente.',
    margin + 3,
    currentY + 6
  );
  doc.text(
    'A HealthAI não realiza diagnósticos médicos, não prescreve medicamentos e não substitui o julgamento clínico presencial de um médico.',
    margin + 3,
    currentY + 11
  );

  // 10. Add Page Numbers on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `HealthAI • Documento Seguro • Paciente: ${userProfile.name} • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}
