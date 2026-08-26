import React, { useState, useRef } from "react";
import { 
  FileText, 
  Search, 
  Plus, 
  FileCheck,
  Calendar, 
  User, 
  Building2, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Heart,
  Activity,
  Lock,
  Download,
  FileSpreadsheet,
  FileImage,
  RefreshCw,
  Edit3,
  X,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { LabExam, FamilyMember } from "../types";
import { getAuthHeaders } from "../lib/apiClient";
import { saveExam, deleteExam } from "../lib/healthStorage";
import { trackEvent, trackAiUsage } from "../lib/analytics";

interface ExamsCentralViewProps {
  exams: LabExam[];
  activeMember: FamilyMember | null;
  onRefreshExams: () => void;
  onBack: () => void;
}

type AddModalMode = "upload" | "review" | "manual";

export const ExamsCentralView: React.FC<ExamsCentralViewProps> = ({
  exams,
  activeMember,
  onRefreshExams,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedExam, setSelectedExam] = useState<LabExam | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<AddModalMode>("upload");

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LabExam["category"]>("Laboratorial");
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [laboratory, setLaboratory] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [rawText, setRawText] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiSimpleTranslation, setAiSimpleTranslation] = useState("");
  const [keyFindings, setKeyFindings] = useState<Array<{
    parameter: string;
    value: string;
    status: 'normal' | 'altered' | 'attention';
    simpleExplanation: string;
    reference_interval?: string;
  }>>([]);

  // Uploaded File Metadata
  const [fileMetadata, setFileMetadata] = useState<{
    storagePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);

  // Loading & Error States
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);

  const categories = ["Todas", "Laboratorial", "Imagem", "Cardiológico", "Genético", "Outro"];

  const filteredExams = exams.filter(e => {
    const matchesCategory = selectedCategory === "Todas" || e.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      e.title.toLowerCase().includes(term) ||
      (e.laboratory || '').toLowerCase().includes(term) ||
      (e.doctor_name || '').toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  const resetForm = () => {
    setTitle("");
    setCategory("Laboratorial");
    setExamDate(new Date().toISOString().split('T')[0]);
    setLaboratory("");
    setDoctorName("");
    setRawText("");
    setAiSummary("");
    setAiSimpleTranslation("");
    setKeyFindings([]);
    setFileMetadata(null);
    setModalError(null);
    setAddMode("upload");
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validação estrita no cliente
    const validMimes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const isExtensionValid = /\.(pdf|jpg|jpeg|png|webp)$/i.test(file.name);

    if (!validMimes.includes(file.type) && !isExtensionValid) {
      setModalError("Formato não suportado. Envie um arquivo PDF, JPG, PNG ou WebP.");
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
    if (file.size > MAX_SIZE) {
      setModalError("O arquivo excede o limite de 15 MB.");
      return;
    }

    setModalError(null);
    setIsProcessingFile(true);
    setProcessingStage("Criptografando e enviando documento para armazenamento seguro...");

    try {
      // Ler arquivo como base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProcessingStage("Lendo laudo e extraindo biomarcadores com IA Gemini...");

      const headers = await getAuthHeaders();
      const response = await fetch("/api/ai/analyze-exam-document", {
        method: "POST",
        headers,
        body: JSON.stringify({
          base64Data,
          fileName: file.name,
          category,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao processar o exame no servidor.");
      }

      const data = await response.json();
      const extracted = data.extractedData || {};

      // Preencher formulário de revisão
      setTitle(extracted.title || file.name.replace(/\.[^/.]+$/, ""));
      setCategory(extracted.category || "Laboratorial");
      setExamDate(extracted.exam_date || new Date().toISOString().split('T')[0]);
      setLaboratory(extracted.laboratory || "");
      setDoctorName(extracted.doctor_name || "");
      setRawText(extracted.raw_text || "");
      setAiSummary(extracted.ai_summary || "Exame digitalizado e estruturado.");
      setAiSimpleTranslation(extracted.ai_simple_translation || "Os parâmetros do exame foram processados e vinculados ao prontuário.");
      setKeyFindings(Array.isArray(extracted.ai_key_findings) ? extracted.ai_key_findings : []);

      if (data.fileMetadata) {
        setFileMetadata(data.fileMetadata);
      }

      trackAiUsage('exam_explanation');
      trackEvent('document_uploaded', { category });

      // Avançar para a etapa de revisão humana
      setAddMode("review");
    } catch (err: any) {
      console.error("Erro no upload/processamento do exame:", err);
      setModalError(err.message || "Não foi possível processar o arquivo. Tente novamente ou cadastre manualmente.");
    } finally {
      setIsProcessingFile(false);
      setProcessingStage("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSaveConfirmedExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setModalError("O título do exame é obrigatório.");
      return;
    }

    const newExam: LabExam = {
      id: "exam-" + Date.now(),
      user_id: "usr-default",
      family_member_id: activeMember?.id || null,
      title: title.trim(),
      category,
      exam_date: examDate,
      laboratory: laboratory.trim() || undefined,
      doctor_name: doctorName.trim() || undefined,
      file_url: fileMetadata?.storagePath || undefined,
      raw_text: rawText.trim() || undefined,
      ai_summary: aiSummary || "Exame registrado com sucesso.",
      ai_simple_translation: aiSimpleTranslation || "Resultados organizados no prontuário.",
      ai_key_findings: keyFindings,
      status: "processed",
      created_at: new Date().toISOString(),
    };

    saveExam(newExam);
    trackEvent('exam_created', { category, has_file: Boolean(fileMetadata) });
    onRefreshExams();
    setShowAddModal(false);
    resetForm();
  };

  const handleViewOriginalFile = async (storagePath?: string) => {
    if (!storagePath) return;

    setIsOpeningFile(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/exams/signed-url", {
        method: "POST",
        headers,
        body: JSON.stringify({ storagePath }),
      });

      if (!res.ok) {
        throw new Error("Não foi possível gerar o link seguro do arquivo.");
      }

      const { signedUrl } = await res.json();
      if (signedUrl) {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao abrir o arquivo original.");
    } finally {
      setIsOpeningFile(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Deseja remover este exame do prontuário?")) {
      deleteExam(id);
      onRefreshExams();
      if (selectedExam?.id === id) setSelectedExam(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Back & Header */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
      >
        <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Voltar ao Dashboard</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Central de Exames & Laudos com IA</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Envie laudos em PDF ou foto para extração automática de biomarcadores e tradução médica em linguagem simples.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Cadastrar Novo Exame</span>
        </button>
      </div>

      {/* Clinical Disclaimer & Security Banner */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] shrink-0 font-mono border border-emerald-200 dark:border-emerald-800">
            LETRAMENTO MÉDICO
          </span>
          <span className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
            As extrações e traduções por IA têm finalidade de organização pessoal. 
            <strong> Não substituem o diagnóstico, laudo assinado ou conduta do seu médico.</strong>
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] text-emerald-700 dark:text-emerald-400 font-mono shrink-0 flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>Storage Privado &bull; 256-Bit LGPD</span>
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, laboratório ou médico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl space-y-4 shadow-xs transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase">
                  {exam.category}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {exam.exam_date}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{exam.title}</h3>
                {exam.file_url && (
                  <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 shrink-0" title="Arquivo original anexado">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                {exam.laboratory && <div><strong>Laboratório:</strong> {exam.laboratory}</div>}
                {exam.doctor_name && <div><strong>Médico:</strong> {exam.doctor_name}</div>}
              </div>

              {/* AI Simple Translation Box */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                  <FileCheck className="w-3.5 h-3.5" /> Tradução em Linguagem Simples:
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  {exam.ai_simple_translation || exam.ai_summary}
                </p>
              </div>

              {/* Findings preview */}
              {exam.ai_key_findings && exam.ai_key_findings.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {exam.ai_key_findings.slice(0, 3).map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-mono">
                      {f.parameter}: <strong>{f.value}</strong>
                    </span>
                  ))}
                  {exam.ai_key_findings.length > 3 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-mono">
                      +{exam.ai_key_findings.length - 3} marcadores
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions Bottom */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedExam(exam)}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Laudo Completo</span>
              </button>

              <button
                onClick={() => handleDelete(exam.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                title="Excluir exame"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
            <FileText className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhum exame encontrado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Envie laudos em PDF ou fotos para manter o histórico de saúde do seu prontuário sempre completo.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Enviar Primeiro Exame</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: View Exam Details */}
      {selectedExam && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedExam(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase">
                    {selectedExam.category}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedExam.exam_date}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedExam.title}</h3>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <div><strong>Laboratório / Clínica:</strong> {selectedExam.laboratory || "Não especificado"}</div>
                <div><strong>Médico Responsável:</strong> {selectedExam.doctor_name || "Não especificado"}</div>
              </div>

              {/* Botão para visualizar arquivo original no Storage Seguro */}
              {selectedExam.file_url && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>Arquivo Original Criptografado Disponível</span>
                  </div>
                  <button
                    onClick={() => handleViewOriginalFile(selectedExam.file_url)}
                    disabled={isOpeningFile}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {isOpeningFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    <span>Abrir Arquivo Original</span>
                  </button>
                </div>
              )}

              {/* AI Simple Translation Detailed */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Tradução Médica Educacional para o Paciente
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-xs">
                  {selectedExam.ai_simple_translation || selectedExam.ai_summary}
                </p>
              </div>

              {/* Key Findings List */}
              {selectedExam.ai_key_findings && selectedExam.ai_key_findings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Biomarcadores & Parâmetros Estruturados:</h4>
                  <div className="grid gap-2">
                    {selectedExam.ai_key_findings.map((f, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white text-xs">{f.parameter}</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{f.simpleExplanation}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs shrink-0 self-start sm:self-auto shadow-xs">
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedExam.raw_text && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Texto Extraído do Laudo:</h4>
                  <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedExam.raw_text}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add & Process Exam (Upload-First Architecture) */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessingFile) setShowAddModal(false);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {addMode === "upload" && "Cadastrar Novo Exame"}
                    {addMode === "review" && "Revisar Dados Extraídos pela IA"}
                    {addMode === "manual" && "Cadastro Manual de Exame"}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {addMode === "upload" && "Envie o arquivo original (PDF ou Foto) para leitura e tradução automática com IA."}
                  {addMode === "review" && "Confira as informações extraídas do documento antes de salvar no prontuário."}
                  {addMode === "manual" && "Preencha os dados do exame e laudo manualmente."}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={isProcessingFile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Alert */}
            {modalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            {/* ── ESTADO 1: FLUXO PRINCIPAL DE UPLOAD ── */}
            {addMode === "upload" && (
              <div className="space-y-5">
                {isProcessingFile ? (
                  <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Processando Documento de Saúde...</h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{processingStage}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Garantia de segurança: dados tratados sob sigilo absoluto (LGPD).
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                        isDragging
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[1.01]"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-950"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf, .jpg, .jpeg, .png, .webp, image/*, application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />

                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                        <Upload className="w-7 h-7" />
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Envie seu exame ou laudo médico
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Arraste e solte o arquivo aqui ou <span className="text-emerald-600 dark:text-emerald-400 font-bold underline">procure no seu dispositivo</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">PDF</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">JPG / JPEG</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">PNG</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Até 15 MB</span>
                      </div>
                    </div>

                    {/* Fallback Option */}
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                      <span className="flex-shrink mx-4 text-[10px] font-mono uppercase text-slate-400 font-bold">OU</span>
                      <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setAddMode("manual")}
                        className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline underline-offset-4 cursor-pointer transition"
                      >
                        Prefiro cadastrar os dados manualmente
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ESTADO 2: REVISÃO DOS DADOS EXTRAÍDOS PELA IA (HUMAN IN THE LOOP) ── */}
            {addMode === "review" && (
              <form onSubmit={handleSaveConfirmedExam} className="space-y-4 text-xs overflow-y-auto custom-scrollbar pr-1">
                
                {/* Linked File Card */}
                {fileMetadata && (
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        {fileMetadata.mimeType.includes("pdf") ? <FileText className="w-4 h-4" /> : <FileImage className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <span className="block font-bold text-slate-900 dark:text-white truncate">{fileMetadata.fileName}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {(fileMetadata.fileSize / 1024 / 1024).toFixed(2)} MB &bull; Armazenamento Criptografado Vinculado
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold shrink-0">
                      Arquivo Vinculado
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Título do Exame *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Hemograma Completo"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Categoria</label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Laboratorial">Laboratorial</option>
                      <option value="Imagem">Imagem (Raio-X, Tomo, USG)</option>
                      <option value="Cardiológico">Cardiológico</option>
                      <option value="Genético">Genético</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Data do Exame</label>
                    <input
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Laboratório / Clínica</label>
                    <input
                      type="text"
                      value={laboratory}
                      onChange={(e) => setLaboratory(e.target.value)}
                      placeholder="Ex: Fleury, Dasa, Sabin"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Médico Responsável</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Ex: Dr. Roberto Silveira"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Biomarcadores Extraídos */}
                {keyFindings.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                      Biomarcadores Extraídos ({keyFindings.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {keyFindings.map((finding, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <input
                            type="text"
                            value={finding.parameter}
                            onChange={(e) => {
                              const updated = [...keyFindings];
                              updated[idx].parameter = e.target.value;
                              setKeyFindings(updated);
                            }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                            placeholder="Marcador"
                          />
                          <input
                            type="text"
                            value={finding.value}
                            onChange={(e) => {
                              const updated = [...keyFindings];
                              updated[idx].value = e.target.value;
                              setKeyFindings(updated);
                            }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                            placeholder="Valor"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={finding.status}
                              onChange={(e: any) => {
                                const updated = [...keyFindings];
                                updated[idx].status = e.target.value;
                                setKeyFindings(updated);
                              }}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:text-white flex-1"
                            >
                              <option value="normal">Normal</option>
                              <option value="attention">Atenção</option>
                              <option value="altered">Alterado</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setKeyFindings(keyFindings.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tradução IA */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tradução em Linguagem Simples (Paciente)
                  </label>
                  <textarea
                    rows={3}
                    value={aiSimpleTranslation}
                    onChange={(e) => setAiSimpleTranslation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAddMode("upload")}
                    className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Voltar / Outro Arquivo
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar & Salvar no Prontuário</span>
                  </button>
                </div>
              </form>
            )}

            {/* ── ESTADO 3: CADASTRO MANUAL DE EXAME ── */}
            {addMode === "manual" && (
              <form onSubmit={handleSaveConfirmedExam} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Título do Exame *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Hemograma Completo, Ressonância Magnética, etc"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Categoria</label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Laboratorial">Laboratorial</option>
                      <option value="Imagem">Imagem (Raio-X, Tomo, USG)</option>
                      <option value="Cardiológico">Cardiológico</option>
                      <option value="Genético">Genético</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Data do Exame</label>
                    <input
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Laboratório / Clínica</label>
                    <input
                      type="text"
                      value={laboratory}
                      onChange={(e) => setLaboratory(e.target.value)}
                      placeholder="Ex: Fleury, Dasa, Sabin"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Médico Solicitante</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Ex: Dr. Roberto Silveira"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Texto ou Resultados do Laudo
                  </label>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Cole aqui o texto do resultado ou as conclusões do laudo..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex justify-between items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddMode("upload")}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
                  >
                    &larr; Voltar para Upload de Arquivo
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition"
                    >
                      Salvar Exame
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
