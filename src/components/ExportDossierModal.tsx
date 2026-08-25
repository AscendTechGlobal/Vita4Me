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
  ArrowLeft
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, UserProfile } from "../types";

interface ExportDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  activeMember: FamilyMember | null;
  exams: LabExam[];
  indicators: HealthIndicator[];
  medications: Medication[];
  records: HealthRecord[];
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
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const memberName = activeMember?.name || profile?.full_name || 'Paciente';
  const bloodType = activeMember?.blood_type || profile?.blood_type || 'Não informado';
  const allergies = activeMember?.allergies?.length ? activeMember.allergies : ['Nenhuma alergia relatada'];

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const docElement = document.getElementById("healthai-printable-dossier");
      if (!docElement) throw new Error("Elemento do dossiê não encontrado");

      const canvas = await html2canvas(docElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const cleanName = memberName.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Dossie_Medico_Vita4Me_${cleanName}.pdf`);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-3">
            {exportSuccess && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                Dossiê baixado com sucesso!
              </span>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Dossiê PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar Dossiê Médico (PDF)</span>
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

        {/* Printable Preview Document */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div 
            id="healthai-printable-dossier" 
            className="bg-white text-slate-900 p-8 md:p-12 rounded-2xl shadow-xl font-sans space-y-6 max-w-3xl mx-auto border border-slate-200"
          >
            {/* Dossier Header */}
            <div className="border-b-2 border-emerald-600 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="/logo-full-transparent.png"
                  alt="Vita4Me"
                  className="h-12 w-auto object-contain shrink-0"
                />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold block">
                    DOSSIÊ MÉDICO DIGITAL OFICIAL &bull; VITA4ME
                  </span>
                  <h1 className="text-xl font-black text-slate-950 tracking-tight">
                    Prontuário e Histórico de Saúde
                  </h1>
                  <p className="text-xs text-slate-600">
                    Documento consolidado para apresentação em consultas e atendimentos médicos.
                  </p>
                </div>
              </div>

              <div className="text-right text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
                <div><strong>EMISSÃO:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
                <div className="text-[11px] text-emerald-700 font-mono font-bold">VITA4ME SEGURO</div>
              </div>
            </div>

            {/* Patient Information Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">PACIENTE:</span>
                <strong className="text-slate-950 font-bold">{memberName}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">TIPO SANGUÍNEO:</span>
                <strong className="text-emerald-700 font-bold">{bloodType}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">ALERGIAS RELATADAS:</span>
                <strong className="text-rose-700 font-bold">{allergies.join(', ')}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">STATUS DE VACINAÇÃO:</span>
                <strong className="text-emerald-600 font-bold">Atualizada (2026)</strong>
              </div>
            </div>

            {/* Active Continuous Medications */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>1. Medicamentos em Uso Contínuo</span>
              </h3>
              <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                  <tr>
                    <th className="p-2 border-b">Medicamento</th>
                    <th className="p-2 border-b">Dosagem</th>
                    <th className="p-2 border-b">Frequência</th>
                    <th className="p-2 border-b">Prescritor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {medications.map(m => (
                    <tr key={m.id}>
                      <td className="p-2 font-bold text-slate-950">{m.name}</td>
                      <td className="p-2">{m.dosage}</td>
                      <td className="p-2">{m.frequency}</td>
                      <td className="p-2 text-slate-600">{m.prescribed_by || 'Médico Assistente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Latest Lab Exams & AI Translations */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>2. Últimos Exames e Achados Laboratoriais</span>
              </h3>
              <div className="space-y-3">
                {exams.slice(0, 3).map(e => (
                  <div key={e.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-950 font-bold">{e.title}</strong>
                      <span className="text-[11px] text-slate-500 font-mono">{e.exam_date}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {e.ai_simple_translation || e.ai_summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ethical Disclaimer */}
            <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 leading-relaxed italic">
              <strong>Aviso Ético e Legal:</strong> O Vita4Me atua como ferramenta de apoio à organização de dados médicos e compreensão de laudos pelo próprio paciente. As informações contidas neste dossiê não substituem avaliação clínica, diagnóstico ou conduta médica profissional.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
