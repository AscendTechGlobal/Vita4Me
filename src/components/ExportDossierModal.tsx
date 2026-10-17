import React, { useState } from "react";
import { 
  X, 
  Download, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Heart, 
  Calendar, 
  Activity, 
  Pill, 
  ShieldCheck,
  User,
  ArrowLeft,
  Printer,
  Droplet,
  Moon,
  AlertTriangle,
  Clock,
  Sparkles
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, UserProfile, DailyHabit } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

interface ExportDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  activeMember: FamilyMember | null;
  exams: LabExam[];
  indicators: HealthIndicator[];
  medications: Medication[];
  records: HealthRecord[];
  todayHabit?: DailyHabit;
}

export const ExportDossierModal: React.FC<ExportDossierModalProps> = ({
  isOpen,
  onClose,
  profile,
  activeMember,
  exams,
  indicators,
  medications,
  records,
  todayHabit,
}) => {
  const { dictionary, language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Isolamento estrito por Membro Familiar selecionado
  const memberExams = exams.filter(e => {
    if (!activeMember || activeMember.id === 'fam-me') {
      return !e.family_member_id || e.family_member_id === 'fam-me';
    }
    return e.family_member_id === activeMember.id;
  }).sort((a, b) => {
    const timeA = new Date(a.exam_date || a.created_at || 0).getTime();
    const timeB = new Date(b.exam_date || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const memberIndicators = indicators.filter(i => {
    if (!activeMember || activeMember.id === 'fam-me') {
      return !i.family_member_id || i.family_member_id === 'fam-me';
    }
    return i.family_member_id === activeMember.id;
  }).sort((a, b) => {
    const timeA = new Date(a.measured_at || a.created_at || 0).getTime();
    const timeB = new Date(b.measured_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const activeMeds = medications
    .filter(m => {
      if (!activeMember || activeMember.id === 'fam-me') {
        return !m.family_member_id || m.family_member_id === 'fam-me';
      }
      return m.family_member_id === activeMember.id;
    })
    .filter(m => m.is_active);

  const memberRecords = records
    .filter(r => {
      if (!activeMember || activeMember.id === 'fam-me') {
        return !r.family_member_id || r.family_member_id === 'fam-me';
      }
      return r.family_member_id === activeMember.id;
    })
    .sort((a, b) => {
      const timeA = new Date(a.event_date || a.created_at || 0).getTime();
      const timeB = new Date(b.event_date || b.created_at || 0).getTime();
      return timeB - timeA;
    });

  // Dados Antropométricos e Demográficos
  const memberName = activeMember?.name || profile?.full_name || 'Paciente';
  const bloodType = activeMember?.blood_type || profile?.blood_type || dictionary.dossier.notInformed;
  const allergies = activeMember?.allergies?.length 
    ? activeMember.allergies 
    : (profile?.allergies?.length ? profile.allergies : [dictionary.dossier.noAllergies]);
  const chronicConditions = activeMember?.chronic_conditions?.length 
    ? activeMember.chronic_conditions 
    : (profile?.chronic_conditions?.length ? profile.chronic_conditions : []);

  const birthDate = activeMember?.date_of_birth || profile?.date_of_birth;
  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    try {
      const birth = new Date(dob);
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? age : null;
    } catch {
      return null;
    }
  };
  const age = calculateAge(birthDate);

  const gender = activeMember?.gender || profile?.gender || dictionary.dossier.notInformed;
  const weight = activeMember?.weight_kg || profile?.weight_kg;
  const height = activeMember?.height_cm || profile?.height_cm;

  const imc = (weight && height) ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : null;
  const getImcClassification = (val: number) => {
    if (val < 18.5) return dictionary.dossier.underweight;
    if (val < 25) return dictionary.dossier.normalWeight;
    if (val < 30) return dictionary.dossier.overweight;
    if (val < 35) return dictionary.dossier.obesity1;
    return dictionary.dossier.obesity23;
  };

  const localeStr = language === 'en' ? 'en-US' : (language === 'es' ? 'es-ES' : 'pt-BR');

  // Tradução dinâmica de nomes de biomarcadores laboratoriais padrão
  const formatBiomarkerName = (rawName: string) => {
    if (!rawName) return '';
    const lower = rawName.toLowerCase();
    if (language === 'es') {
      if (lower.includes('colesterol total')) return 'Colesterol total';
      if (lower.includes('ldl') || lower.includes('colesterol ldl')) return 'Colesterol LDL';
      if (lower.includes('hdl') || lower.includes('colesterol hdl')) return 'Colesterol HDL';
      if (lower.includes('triglic')) return 'Triglicéridos';
      if (lower.includes('glicem') || lower.includes('glicose')) return 'Glucosa';
      if (lower.includes('vitamina d')) return 'Vitamina D (25-OH)';
      if (lower.includes('pressão sistólica') || lower.includes('sistolica')) return 'Presión Sistólica';
      if (lower.includes('pressão diastólica') || lower.includes('diastolica')) return 'Presión Diastólica';
      if (lower.includes('peso')) return 'Peso corporal';
      if (lower.includes('ureia') || lower.includes('urea')) return 'Urea';
      if (lower.includes('creatinina')) return 'Creatinina';
      if (lower.includes('ácido úrico') || lower.includes('acido urico')) return 'Ácido úrico';
      if (lower.includes('hemoglobina glicada') || lower.includes('hba1c')) return 'Hemoglobina glicosilada (HbA1c)';
      if (lower.includes('insulina')) return 'Insulina basal';
      if (lower.includes('ferritina')) return 'Ferritina';
    } else if (language === 'en') {
      if (lower.includes('colesterol total')) return 'Total Cholesterol';
      if (lower.includes('ldl') || lower.includes('colesterol ldl')) return 'LDL Cholesterol';
      if (lower.includes('hdl') || lower.includes('colesterol hdl')) return 'HDL Cholesterol';
      if (lower.includes('triglic')) return 'Triglycerides';
      if (lower.includes('glicem') || lower.includes('glicose')) return 'Fasting Blood Glucose';
      if (lower.includes('vitamina d')) return 'Vitamin D (25-OH)';
      if (lower.includes('pressão sistólica') || lower.includes('sistolica')) return 'Systolic Blood Pressure';
      if (lower.includes('pressão diastólica') || lower.includes('diastolica')) return 'Diastolic Blood Pressure';
      if (lower.includes('peso')) return 'Body Weight';
      if (lower.includes('ureia') || lower.includes('urea')) return 'Urea / BUN';
      if (lower.includes('creatinina')) return 'Creatinine';
      if (lower.includes('ácido úrico') || lower.includes('acido urico')) return 'Uric Acid';
      if (lower.includes('hemoglobina glicada') || lower.includes('hba1c')) return 'Glycated Hemoglobin (HbA1c)';
      if (lower.includes('insulina')) return 'Fasting Insulin';
      if (lower.includes('ferritina')) return 'Ferritin';
    }
    return rawName;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString.includes('T') ? isoString : `${isoString}T12:00:00Z`);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString(localeStr);
    } catch {
      return '';
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const docElement = document.getElementById("healthai-printable-dossier");
      if (!docElement) throw new Error("Elemento do dossiê não encontrado");

      // Clonar e garantir renderização sem interferência de scroll de container
      const canvas = await html2canvas(docElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      // Se couber em uma página ou se precisar de múltiplas páginas com fatiamento exato
      let heightLeft = imgHeight;
      let position = 0;

      // Primeira página
      const pageCanvasHeight = (canvas.width * pageHeight) / pageWidth;

      if (imgHeight <= pageHeight) {
        const imgData = canvas.toDataURL("image/jpeg", 0.96);
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-página por fatiamento limpo de canvas
        let renderedHeight = 0;
        let pageIdx = 0;

        while (renderedHeight < canvas.height) {
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
          sliceCanvas.height = currentSliceHeight;

          const sliceCtx = sliceCanvas.getContext("2d");
          if (sliceCtx) {
            sliceCtx.fillStyle = "#ffffff";
            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            sliceCtx.drawImage(
              canvas,
              0, renderedHeight, canvas.width, currentSliceHeight,
              0, 0, canvas.width, currentSliceHeight
            );

            const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.96);
            const sliceImgHeight = (currentSliceHeight * pageWidth) / canvas.width;

            if (pageIdx > 0) pdf.addPage();
            pdf.addImage(sliceData, "JPEG", 0, 0, imgWidth, sliceImgHeight);
          }

          renderedHeight += currentSliceHeight;
          pageIdx++;
        }
      }

      const cleanName = memberName.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Dossie_Clinico_Vita4Me_${cleanName}.pdf`);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      // Fallback sem disparar print se o usuário clicou em Download
      alert("Houve uma instabilidade momentânea ao renderizar o PDF. Recomendamos usar o botão 'Imprimir' para salvar diretamente como PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col my-auto">
        {/* Navigation & Actions Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{dictionary.common.back}</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {exportSuccess && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                {dictionary.dossier.downloadSuccess}
              </span>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700"
              title={dictionary.dossier.printTooltip}
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>{dictionary.common.print}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{dictionary.common.loading}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{dictionary.common.download} {dictionary.nav.dossierPdf}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Preview */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 bg-slate-100 dark:bg-slate-950/60 p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div 
            id="healthai-printable-dossier" 
            className="bg-white text-slate-900 p-6 md:p-10 rounded-2xl shadow-xl font-sans space-y-6 max-w-3xl mx-auto border border-slate-200"
          >
            {/* Header Oficial do Dossiê */}
            <div className="border-b-2 border-emerald-600 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  V4
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold block">
                    {dictionary.dossier.officialBadge}
                  </span>
                  <h1 className="text-xl font-black text-slate-950 tracking-tight">
                    {dictionary.dossier.title}
                  </h1>
                  <p className="text-xs text-slate-600">
                    {dictionary.dossier.subtitle}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
                <div><strong>{dictionary.dossier.issueDate}</strong> {new Date().toLocaleDateString(localeStr)} {language === 'pt' ? 'às' : (language === 'es' ? 'a las' : 'at')} {new Date().toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-[10px] text-emerald-700 font-mono font-bold">{dictionary.dossier.protocol}: V4M-{Date.now().toString(36).toUpperCase()}</div>
              </div>
            </div>

            {/* Quadro Completo de Identificação do Paciente & Biometria */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs page-break-inside-avoid">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.patient}</span>
                  <strong className="text-slate-950 font-bold text-sm">{memberName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.genderAge}</span>
                  <strong className="text-slate-900">
                    {gender} {age ? `• ${age}` : (birthDate ? `• ${formatDate(birthDate)}` : '')}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.bloodType}</span>
                  <strong className="text-emerald-700 font-bold">{bloodType}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.weightHeight}</span>
                  <strong className="text-slate-900">
                    {weight ? `${weight} kg` : '--'} {height ? `• ${height} cm` : ''}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.estimatedBmi}</span>
                  {imc ? (
                    <strong className="text-slate-900">
                      {imc} kg/m² <span className="text-[11px] text-slate-600 font-normal">({getImcClassification(imc)})</span>
                    </strong>
                  ) : (
                    <span className="text-slate-500">--</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.allergies}</span>
                  <strong className={allergies.some(a => !a.toLowerCase().includes('nenhuma') && !a.toLowerCase().includes('none') && !a.toLowerCase().includes('ninguna')) ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                    {allergies.join(', ')}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.chronicConditions}</span>
                  <strong className="text-slate-900">
                    {chronicConditions.length ? chronicConditions.join(', ') : '--'}
                  </strong>
                </div>
              </div>
            </div>

            {/* SEÇÃO 1: SINAIS VITAIS & INDICADORES CLÍNICOS DO DASHBOARD */}
            <div className="space-y-2 page-break-inside-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>{dictionary.dossier.vitalsTitle}</span>
              </h3>

              {memberIndicators.length > 0 ? (
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase">
                    <tr>
                      <th className="p-2 border-b">{dictionary.dossier.indicatorCol}</th>
                      <th className="p-2 border-b">{dictionary.dossier.lastMeasuredCol}</th>
                      <th className="p-2 border-b">{dictionary.dossier.valueCol}</th>
                      <th className="p-2 border-b">{dictionary.dossier.referenceCol}</th>
                      <th className="p-2 border-b">{dictionary.dossier.evalCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {memberIndicators.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-950">{formatBiomarkerName(i.name)}</td>
                        <td className="p-2 text-slate-500 font-mono text-[11px]">{formatDate(i.measured_at)}</td>
                        <td className="p-2 font-mono font-bold text-slate-900">
                          {i.value} <span className="text-[11px] font-normal text-slate-600">{i.unit}</span>
                        </td>
                        <td className="p-2 text-slate-500 text-[11px]">
                          {i.reference_min !== undefined && i.reference_max !== undefined && i.reference_min !== null && i.reference_max !== null
                            ? `${i.reference_min} ${dictionary.dossier.to} ${i.reference_max} ${i.unit}`
                            : (i.reference_max !== undefined && i.reference_max !== null
                                ? `${dictionary.dossier.upTo} ${i.reference_max} ${i.unit}`
                                : dictionary.dossier.perLabReport)}
                        </td>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            i.status === 'normal' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {i.status === 'normal' ? dictionary.dossier.normalEval : dictionary.dossier.attentionEval}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                  {dictionary.dossier.emptyVitals}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: MEDICAMENTOS EM USO CONTÍNUO */}
            <div className="space-y-2 page-break-inside-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>{dictionary.dossier.medicationsTitle}</span>
              </h3>

              {activeMeds.length > 0 ? (
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase">
                    <tr>
                      <th className="p-2 border-b">{dictionary.dossier.medicationCol}</th>
                      <th className="p-2 border-b">{dictionary.dossier.dosageCol}</th>
                      <th className="p-2 border-b">{dictionary.dossier.frequencyCol}</th>
                      <th className="p-2 border-b">{dictionary.dossier.prescriberCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeMeds.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-950">{m.name}</td>
                        <td className="p-2">{m.dosage}</td>
                        <td className="p-2">{m.frequency}</td>
                        <td className="p-2 text-slate-600">{m.prescribed_by || dictionary.dossier.attendingDoctor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                  {dictionary.dossier.emptyMeds}
                </div>
              )}
            </div>

            {/* SEÇÃO 3: ÚLTIMOS LAUDOS E EXAMES LABORATORIAIS COM TRADUÇÃO DA IA */}
            <div className="space-y-2 page-break-inside-avoid">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>{dictionary.dossier.examsTitle}</span>
              </h3>

              {memberExams.length > 0 ? (
                <div className="space-y-2.5">
                  {memberExams.slice(0, 4).map(e => (
                    <div key={e.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-950 font-bold">{e.title}</strong>
                        <div className="flex items-center gap-2">
                          {e.laboratory && (
                            <span className="text-[11px] text-slate-600 font-medium">Lab: {e.laboratory}</span>
                          )}
                          <span className="text-[11px] text-slate-500 font-mono">Data: {formatDate(e.exam_date)}</span>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-[11px]">
                        {e.ai_simple_translation || e.ai_summary || dictionary.dossier.noExamFindings}
                      </p>
                      {e.ai_key_findings && e.ai_key_findings.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          {e.ai_key_findings.slice(0, 3).map((k, i) => (
                            <span key={i} className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                              • {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                  {dictionary.dossier.emptyExams}
                </div>
              )}
            </div>

            {/* SEÇÃO 4: HISTÓRICO CLÍNICO & CIRURGIAS / INTERNAÇÕES */}
            {memberRecords.length > 0 && (
              <div className="space-y-2 page-break-inside-avoid">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{dictionary.dossier.historyTitle}</span>
                </h3>

                <div className="space-y-2">
                  {memberRecords.slice(0, 3).map(r => (
                    <div key={r.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <strong className="text-slate-950 font-bold block">{r.title}</strong>
                        <p className="text-slate-600 text-[11px]">{r.description || r.doctor_notes || dictionary.dossier.noRecordNotes}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">{formatDate(r.event_date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO 5: HÁBITOS DE VIDA & ROTINA DIÁRIA */}
            {todayHabit && (
              <div className="space-y-2 page-break-inside-avoid">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <Heart className="w-4 h-4 text-emerald-600" />
                  <span>{dictionary.dossier.habitsTitle}</span>
                </h3>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.hydration}</span>
                    <strong className="text-slate-950 text-sm">{todayHabit.water_ml} ml</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.sleepHabit}</span>
                    <strong className="text-slate-950 text-sm">{todayHabit.sleep_hours} h</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">{dictionary.dossier.exerciseHabit}</span>
                    <strong className="text-slate-950 text-sm">{todayHabit.exercise_minutes} min</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé Ético, Jurídico e Espaço para Anotações Médicas */}
            <div className="border-t border-slate-200 pt-3 space-y-2 text-[10px] text-slate-500 leading-relaxed page-break-inside-avoid">
              <p className="italic">
                {dictionary.dossier.disclaimer}
              </p>
              <div className="flex justify-between items-center pt-2 text-[9px] text-slate-400 font-mono">
                <span>VITA4ME DIGITAL HEALTH SYSTEM &bull; COMPLIANT</span>
                <span>{new Date().toLocaleDateString(localeStr)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
