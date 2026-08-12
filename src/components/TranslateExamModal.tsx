import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  Loader2,
  Share2
} from 'lucide-react';
import { Exam } from '../types';

interface TranslateExamModalProps {
  exam: Exam | null;
  onClose: () => void;
}

export const TranslateExamModal: React.FC<TranslateExamModalProps> = ({
  exam,
  onClose
}) => {
  if (!exam) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [translationResult, setTranslationResult] = useState<{
    translatedText?: string;
    keyHighlights?: string[];
    questionsForDoctor?: string[];
  } | null>({
    translatedText: exam.translatedExplanation || "Este exame apresenta boa contagem de leucócitos e plaquetas. Houve uma pequena alteração no colesterol LDL (138 mg/dL) e na Vitamina D (28.5 ng/mL), recomendando-se orientação alimentar e acompanhamento de rotina.",
    keyHighlights: [
      "Glicemia em jejum (92 mg/dL) e Hemograma dentro dos padrões ideais.",
      "Colesterol LDL (138 mg/dL) levemente elevado acima da meta ideal (<100 mg/dL).",
      "Vitamina D (28.5 ng/mL) limítrofe, podendo se beneficiar de suplementação."
    ],
    questionsForDoctor: [
      "Quais mudanças na alimentação são mais recomendadas para equilibrar o colesterol LDL?",
      "Devo iniciar suplementação diária de Vitamina D3?",
      "Quando devo repetir este exame de sangue para acompanhamento?"
    ]
  });

  const handleReTranslate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gemini/translate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examTitle: exam.title,
          values: exam.values,
          summary: exam.summary,
          laboratory: exam.laboratory
        })
      });

      const data = await response.json();
      if (data.success && data.result) {
        setTranslationResult(data.result);
      }
    } catch (err) {
      console.error("Erro na re-tradução do exame:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative my-8 space-y-6">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-teal-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">HealthAI Tradutor de Exames</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                exam.statusAlert === 'Normal' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {exam.statusAlert}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{exam.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {exam.laboratory} • {exam.date} • {exam.doctorName}
            </p>
          </div>
        </div>

        {/* Translation Content */}
        <div className="space-y-4">
          
          {/* Main Plain Language Explanation Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-teal-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-400" />
                Explicação em Linguagem Simples (Sem Jargão Técnico):
              </span>

              <button
                onClick={handleReTranslate}
                disabled={isLoading}
                className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Re-Analisar com IA"}
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {translationResult?.translatedText}
            </p>
          </div>

          {/* Highlights & Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Key Highlights */}
            {translationResult?.keyHighlights && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Pontos Chave Principais:
                </span>
                <ul className="space-y-1.5">
                  {translationResult.keyHighlights.map((h, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions for Doctor */}
            {translationResult?.questionsForDoctor && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-teal-400" />
                  Perguntas Sugeridas para Fazer ao Médico:
                </span>
                <ul className="space-y-1.5">
                  {translationResult.questionsForDoctor.map((q, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-teal-400 font-bold">?</span>
                      <span>"{q}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* Disclaimer Footer */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-snug">
            ⚠️ <strong>Aviso Importante HealthAI:</strong> A Inteligência Artificial da HealthAI atua exclusivamente na organização e explicação de dados fornecidos. A HealthAI não realiza diagnósticos e não substitui a consulta nem o parecer de um médico profissional.
          </div>

        </div>

      </div>
    </div>
  );
};
