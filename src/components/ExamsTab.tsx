import React, { useState } from 'react';
import { 
  FileText, 
  FileCheck,
  Upload, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Share2,
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';
import { Exam, ExamCategory } from '../types';

interface ExamsTabProps {
  exams: Exam[];
  onOpenTranslateModal: (exam: Exam) => void;
  onAddExam: (newExam: Exam) => void;
}

export const ExamsTab: React.FC<ExamsTabProps> = ({
  exams,
  onOpenTranslateModal,
  onAddExam
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedExamId, setExpandedExamId] = useState<string | null>('ex-001');

  // Filter logic
  const filteredExams = exams.filter(exam => {
    const matchesCategory = selectedCategory === 'Todos' || exam.category === selectedCategory;
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          exam.laboratory.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          exam.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: string[] = ['Todos', 'Laboratorial', 'Imagem', 'Cardiologia', 'Endocrinologia'];

  return (
    <div className="space-y-6">
      
      {/* Header & Upload Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <FileText className="w-4 h-4" />
            <span>Gestão Inteligente de Exames</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Central de Exames & Tradutor IA</h1>
          <p className="text-xs text-slate-300 mt-1">
            Armazene, classifique e entenda exames laboratoriais e de imagem com tradução automática em linguagem simples.
          </p>
        </div>

        <button
          onClick={() => {
            const mockTitle = prompt("Nome do novo exame:", "Ultrassom de Abdômen Total");
            if (mockTitle) {
              const newExam: Exam = {
                id: `ex-${Date.now()}`,
                title: mockTitle,
                category: 'Imagem',
                specialty: 'Radiologia',
                date: new Date().toISOString().split('T')[0],
                doctorName: 'Dr. Fernando Silva',
                laboratory: 'Alta Diagnósticos',
                statusAlert: 'Normal',
                values: [
                  { name: 'Fígado', value: 'Padrão Homogêneo', unit: '', referenceRange: 'Normal', status: 'Normal' },
                  { name: 'Vesícula Biliar', value: 'Sem cálculos', unit: '', referenceRange: 'Normal', status: 'Normal' }
                ],
                summary: 'Ultrassom sem anomalias detectadas. Órgãos abdominais com ecogenocidade preservada.',
                translatedExplanation: 'O ultrassom do seu abdômen mostra que seu fígado, vesícula, rins e pâncreas estão completamente saudáveis e sem nenhuma pedra ou cisto.'
              };
              onAddExam(newExam);
            }
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 shrink-0 transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Upload / Escanear Exame</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por exame ou laboratório..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/80"
          />
        </div>
      </div>

      {/* Exams Accordion List */}
      <div className="space-y-4">
        {filteredExams.map((exam) => {
          const isExpanded = expandedExamId === exam.id;

          return (
            <div 
              key={exam.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-700"
            >
              {/* Exam Card Header */}
              <div 
                onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none bg-slate-900/80 hover:bg-slate-850"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    exam.statusAlert === 'Normal'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{exam.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exam.statusAlert === 'Normal'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        {exam.statusAlert}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {exam.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {exam.date}</span>
                      <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {exam.laboratory}</span>
                      <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> {exam.doctorName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTranslateModal(exam);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-semibold border border-teal-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span className="hidden sm:inline">Traduzir Laudo</span>
                  </button>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Exam Expanded Details */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-5">
                  
                  {/* Summary & Translation Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/20">
                    <div className="flex items-center gap-2 text-teal-300 text-xs font-bold mb-1.5">
                      <FileCheck className="w-4 h-4 text-teal-400" />
                      <span>Explicação em Linguagem Simples (Vita4Me Tradutor)</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {exam.translatedExplanation || exam.summary}
                    </p>
                  </div>

                  {/* Parameters Table */}
                  {exam.values && exam.values.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Parâmetros Analisados ({exam.values.length})
                      </h4>

                      <div className="overflow-x-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-semibold">
                            <tr>
                              <th className="px-4 py-2.5">Indicador / Parâmetro</th>
                              <th className="px-4 py-2.5">Resultado</th>
                              <th className="px-4 py-2.5">Intervalo de Referência</th>
                              <th className="px-4 py-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                            {exam.values.map((v, i) => (
                              <tr key={i} className="hover:bg-slate-900/50">
                                <td className="px-4 py-2.5 font-medium text-slate-200">{v.name}</td>
                                <td className="px-4 py-2.5 font-bold text-white">
                                  {v.value} {v.unit}
                                </td>
                                <td className="px-4 py-2.5 text-slate-400">{v.referenceRange}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    v.status === 'Normal'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                  }`}>
                                    {v.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-slate-500 italic">
                      * Documento original preservado no Cofre de Documentos Médicos.
                    </p>
                    <button 
                      onClick={() => onOpenTranslateModal(exam)}
                      className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Ver Análise Completa & Perguntas para o Médico</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {filteredExams.length === 0 && (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-400">Nenhum exame encontrado para os filtros selecionados.</p>
          </div>
        )}
      </div>

    </div>
  );
};
