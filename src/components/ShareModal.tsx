import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  QrCode, 
  Check, 
  Copy, 
  ShieldCheck, 
  FileText, 
  Download,
  Loader2,
  FileCheck,
  Printer,
  ExternalLink,
  SlidersHorizontal,
  Pill,
  Activity,
  AlertTriangle,
  Stethoscope,
  Syringe,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Lock
} from 'lucide-react';
import { UserProfile, Exam, MedicalRecord, Medication, Allergy, Vaccine, MetricEntry } from '../types';
import { generateHealthSummaryPDF, PDFSectionOptions } from '../utils/pdfGenerator';

interface ShareModalProps {
  userProfile: UserProfile;
  exams: Exam[];
  medicalRecords: MedicalRecord[];
  medications: Medication[];
  allergies: Allergy[];
  vaccines?: Vaccine[];
  metrics?: MetricEntry[];
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  userProfile,
  exams,
  medicalRecords,
  medications,
  allergies,
  vaccines = [],
  metrics = [],
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'digital'>('pdf');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [showCustomOptions, setShowCustomOptions] = useState(false);

  // PDF Configuration State
  const [pdfOptions, setPdfOptions] = useState<PDFSectionOptions>({
    includeProfile: true,
    includeAllergies: true,
    includeMedications: true,
    includeExams: true,
    includeMedicalRecords: true,
    includeMetrics: true,
    includeVaccines: true,
    customDoctorNote: ''
  });

  const shareUrl = `https://vita4me.app/share/patient-${userProfile.cpf.replace(/[^0-9]/g, '')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createPDFInstance = () => {
    return generateHealthSummaryPDF({
      userProfile,
      exams,
      medicalRecords,
      medications,
      allergies,
      vaccines,
      metrics,
      options: pdfOptions
    });
  };

  const handleDownloadPDF = () => {
    try {
      setIsGeneratingPdf(true);
      setTimeout(() => {
        const doc = createPDFInstance();
        const cleanName = userProfile.name.replace(/\s+/g, '_');
        const fileName = `Vita4Me_Resumo_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        setIsGeneratingPdf(false);
        setPdfDownloaded(true);
        setTimeout(() => setPdfDownloaded(false), 4000);
      }, 600);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setIsGeneratingPdf(false);
    }
  };

  const handlePreviewPDF = () => {
    try {
      const doc = createPDFInstance();
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('Erro ao abrir prévia do PDF:', error);
    }
  };

  const toggleOption = (key: keyof PDFSectionOptions) => {
    setPdfOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const activeMedsCount = medications.filter(m => m.active).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Exportar & Compartilhar Histórico</h2>
            <p className="text-xs text-slate-400">
              Gere relatórios médicos em PDF para consultas ou conceda acesso digital protegido
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pdf'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Dossiê Clínico em PDF</span>
          </button>
          <button
            onClick={() => setActiveTab('digital')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'digital'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code & Link Seguro</span>
          </button>
        </div>

        {/* Tab 1: PDF Export Studio */}
        {activeTab === 'pdf' && (
          <div className="space-y-4">
            
            {/* Primary Action Hero Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Resumo Executivo para Médicos</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Formatado em A4
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Documento estruturado pronto para impressão ou envio por e-mail/WhatsApp, contendo identificação do paciente, exames consolidados, remédios em uso, histórico de consultas e dados vitais.
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient Badge Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block">Paciente:</span>
                  <span className="font-semibold text-white truncate block">{userProfile.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Idade / Sangue:</span>
                  <span className="font-semibold text-slate-200">{userProfile.age} anos ({userProfile.bloodType})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Exames Inclusos:</span>
                  <span className="font-semibold text-teal-400">{exams.length} laudos</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Remédios Ativos:</span>
                  <span className="font-semibold text-emerald-400">{activeMedsCount} itens</span>
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Gerando e Compilando PDF...</span>
                    </>
                  ) : pdfDownloaded ? (
                    <>
                      <FileCheck className="w-4 h-4 text-slate-950" />
                      <span>Download Concluído!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Baixar Resumo em PDF (.pdf)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePreviewPDF}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  title="Abrir prévia em nova aba do navegador"
                >
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span>Visualizar</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Customization Accordion */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <button
                type="button"
                onClick={() => setShowCustomOptions(!showCustomOptions)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                  <span>Personalizar Seções do Dossiê Clínico</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>{showCustomOptions ? 'Ocultar opções' : 'Expandir opções'}</span>
                  {showCustomOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {showCustomOptions && (
                <div className="pt-2 space-y-3 border-t border-slate-850">
                  <p className="text-[11px] text-slate-400">
                    Selecione quais blocos de informação devem ser incorporados ao arquivo PDF final:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Alergias */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeAllergies}
                        onChange={() => toggleOption('includeAllergies')}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                      />
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-white block">Alergias & Alertas</span>
                        <span className="text-[10px] text-slate-400">{allergies.length} cadastrada(s)</span>
                      </div>
                    </label>

                    {/* Medicamentos */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeMedications}
                        onChange={() => toggleOption('includeMedications')}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                      />
                      <Pill className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-white block">Medicamentos em Uso</span>
                        <span className="text-[10px] text-slate-400">{activeMedsCount} ativo(s)</span>
                      </div>
                    </label>

                    {/* Exames */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeExams}
                        onChange={() => toggleOption('includeExams')}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                      />
                      <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-white block">Exames e Laudos</span>
                        <span className="text-[10px] text-slate-400">{exams.length} exame(s)</span>
                      </div>
                    </label>

                    {/* Histórico Clínico */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeMedicalRecords}
                        onChange={() => toggleOption('includeMedicalRecords')}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                      />
                      <Stethoscope className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-white block">Consultas & Procedimentos</span>
                        <span className="text-[10px] text-slate-400">{medicalRecords.length} registro(s)</span>
                      </div>
                    </label>

                    {/* Indicadores */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeMetrics}
                        onChange={() => toggleOption('includeMetrics')}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                      />
                      <Activity className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-white block">Indicadores & Sinais Vitais</span>
                        <span className="text-[10px] text-slate-400">{metrics.length} medições</span>
                      </div>
                    </label>

                    {/* Vacinas */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeVaccines}
                        onChange={() => toggleOption('includeVaccines')}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                      />
                      <Syringe className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-white block">Carteira de Vacinação</span>
                        <span className="text-[10px] text-slate-400">{vaccines.length} vacina(s)</span>
                      </div>
                    </label>
                  </div>

                  {/* Optional Custom Doctor Note */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <MessageSquarePlus className="w-3.5 h-3.5 text-teal-400" />
                      <span>Mensagem ou Objetivo Clínico para o Médico (Opcional):</span>
                    </label>
                    <textarea
                      rows={2}
                      value={pdfOptions.customDoctorNote}
                      onChange={(e) => setPdfOptions(prev => ({ ...prev, customDoctorNote: e.target.value }))}
                      placeholder="Ex: Consulta de rotina cardiológica com foco em ajuste de dosagem e avaliação dos exames de colesterol."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: QR Code & Digital Access */}
        {activeTab === 'digital' && (
          <div className="space-y-4">
            
            {/* QR Code Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
              <div className="w-36 h-36 mx-auto bg-white p-3 rounded-2xl flex items-center justify-center shadow-inner">
                <div className="w-full h-full bg-slate-900 rounded-xl flex flex-col items-center justify-center p-2 text-[10px] font-mono text-emerald-400 border-2 border-dashed border-emerald-500">
                  <QrCode className="w-14 h-14 text-white mb-1" />
                  <span className="font-bold">SCAN DOCTOR</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  Apresente este QR Code ao Médico
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  O profissional poderá escanear na câmera do celular ou tablet para visualizar o prontuário seguro em tempo real durante a consulta.
                </p>
              </div>
            </div>

            {/* Secure Link */}
            <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Protegido de Acesso Temporário:</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Security & LGPD Footer */}
        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Criptografia de ponta a ponta. Dados gerados sob controle exclusivo do paciente, em conformidade com a LGPD e normas do CFM.
          </span>
        </div>

      </div>
    </div>
  );
};
