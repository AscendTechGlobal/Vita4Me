import React, { useState } from "react";
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
  Activity
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

  // New Exam Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LabExam["category"]>("Laboratorial");
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [laboratory, setLaboratory] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [rawText, setRawText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

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

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsTranslating(true);
    let aiSummary = "Exame registrado com sucesso no prontuário.";
    let aiSimpleTranslation = "Os dados do laudo foram salvos. Parâmetros clínicos organizados para consulta.";
    let aiKeyFindings: any[] = [];

    try {
      if (rawText.trim()) {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/ai/translate-exam", {
          method: "POST",
          headers,
          body: JSON.stringify({ title, rawText, category }),
        });

        if (res.ok) {
          const aiData = await res.json();
          aiSummary = aiData.ai_summary || aiSummary;
          aiSimpleTranslation = aiData.ai_simple_translation || aiSimpleTranslation;
          aiKeyFindings = aiData.ai_key_findings || [];
          trackAiUsage('exam_explanation');
        }
      }
    } catch (err) {
      console.error("Erro na tradução com IA:", err);
    } finally {
      setIsTranslating(false);
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
      raw_text: rawText.trim() || undefined,
      ai_summary: aiSummary,
      ai_simple_translation: aiSimpleTranslation,
      ai_key_findings: aiKeyFindings,
      status: "processed",
      created_at: new Date().toISOString(),
    };

    saveExam(newExam);
    trackEvent('exam_created', { category });
    onRefreshExams();
    setShowAddModal(false);

    // Reset Form
    setTitle("");
    setLaboratory("");
    setDoctorName("");
    setRawText("");
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
            Armazenamento unificado de laudos laboratoriais, imagem e tradução automática para linguagem compreensível.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar & Traduzir Exame</span>
        </button>
      </div>

      {/* Clinical Disclaimer & Security Banner */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] shrink-0 font-mono border border-emerald-200 dark:border-emerald-800">
            LETRAMENTO MÉDICO
          </span>
          <span className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
            As traduções por IA têm finalidade estritamente informativa e de organização. 
            <strong> Não substituem o diagnóstico, laudo assinado ou conduta do seu médico.</strong>
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] text-emerald-700 dark:text-emerald-400 font-mono shrink-0">
          🔒 Dados Criptografados &bull; LGPD
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

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.title}</h3>
              
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
                    <span className="text-[10px] text-slate-400 self-center">
                      +{exam.ai_key_findings.length - 3} marcadores
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedExam(exam)}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Ver Detalhes
              </button>

              <button
                onClick={() => handleDelete(exam.id)}
                className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1.5"
                title="Excluir exame"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredExams.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-xs">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
            <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhum exame encontrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Cadastre seu laudo laboratorial ou exame de imagem para que a inteligência clínica traduza e organize seus dados.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar primeiro exame</span>
          </button>
        </div>
      )}

      {/* Modal: View Exam Details */}
      {selectedExam && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedExam(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {selectedExam.category || 'Exame Clínico'}
                </span>
                <h2 className="text-xl font-bold text-white mt-1.5">{selectedExam.title}</h2>
                <p className="text-xs text-slate-400">
                  {selectedExam.exam_date} &bull; {selectedExam.laboratory || 'Laboratório de Análises'}
                </p>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" /> O que este exame significa para a sua saúde:
                </span>
                <p className="text-slate-200 leading-relaxed text-xs whitespace-pre-wrap">
                  {selectedExam.ai_simple_translation || selectedExam.ai_summary}
                </p>
              </div>

              {selectedExam.ai_key_findings && selectedExam.ai_key_findings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-white">Marcadores e Indicadores Extraídos:</h3>
                  <div className="space-y-2">
                    {selectedExam.ai_key_findings.map((f, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <strong className="text-white text-xs">{f.parameter}</strong>
                          <p className="text-[11px] text-slate-400">{f.simpleExplanation}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-300 font-mono font-bold text-xs shrink-0 self-start sm:self-auto">
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedExam.raw_text && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-400">Texto Original do Laudo:</h4>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedExam.raw_text}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add & Translate Exam */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isTranslating) setShowAddModal(false);
          }}
        >
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <span>Cadastrar Novo Exame</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cole o laudo do laboratório para que o sistema traduza os termos técnicos.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título do Exame *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Hemograma Completo, Ressonância Magnética, etc"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Laboratorial">Laboratorial</option>
                    <option value="Imagem">Imagem (Raio-X, Tomo, USG)</option>
                    <option value="Cardiológico">Cardiológico</option>
                    <option value="Genético">Genético</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data do Exame</label>
                  <input
                    type="date"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Laboratório / Clínica</label>
                  <input
                    type="text"
                    value={laboratory}
                    onChange={(e) => setLaboratory(e.target.value)}
                    placeholder="Ex: Fleury, Dasa, Sabin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Médico Solicitante</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Ex: Dr. Roberto Silveira"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Texto ou Resultados do Laudo (Para Tradução IA)
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Cole aqui o texto copiado do PDF do resultado ou as conclusões do médico..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isTranslating}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isTranslating}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Traduzindo com IA...</span>
                    </>
                  ) : (
                    <span>Salvar & Traduzir Exame</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
