import React, { useState } from 'react';
import { 
  Stethoscope, 
  FileCheck,
  Calendar, 
  UserCheck, 
  Building, 
  CheckSquare, 
  HelpCircle, 
  FileText, 
  Plus,
  Clock,
  Loader2
} from 'lucide-react';
import { MedicalRecord, UserProfile, Exam, Medication } from '../types';
import { getAuthHeaders } from '../lib/apiClient';

interface AppointmentsTabProps {
  medicalRecords: MedicalRecord[];
  userProfile: UserProfile;
  exams: Exam[];
  medications: Medication[];
  onAddRecord: (record: MedicalRecord) => void;
}

export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({
  medicalRecords,
  userProfile,
  exams,
  medications,
  onAddRecord
}) => {
  const [prepDoctor, setPrepDoctor] = useState<string>('Dr. Roberto Mendonça');
  const [prepSpecialty, setPrepSpecialty] = useState<string>('Clínica Geral');
  const [prepReason, setPrepReason] = useState<string>('Acompanhamento anual, avaliação do colesterol e renovação de receitas.');
  const [isLoadingPrep, setIsLoadingPrep] = useState<boolean>(false);
  const [prepResult, setPrepResult] = useState<{
    summary?: string;
    checklist?: string[];
    suggestedQuestions?: string[];
  } | null>({
    summary: "Sua próxima consulta é com o Clínico Geral. O foco principal deve ser a reavaliação do colesterol LDL e a conferência dos seus níveis de Vitamina D3.",
    checklist: [
      "Levar laudo do último Hemograma e Perfil Lipídico (15/06/2026)",
      "Levar lista de medicamentos ativos (Vitamina D3 2000 UI e Ômega 3)",
      "Anotar episódios recentes de cansaço ou alterações na rotina de sono",
      "Estar em jejum caso o médico solicite coleta imediata de exames suplementares"
    ],
    suggestedQuestions: [
      "Com a melhora na minha alimentação, o nível de LDL (138 mg/dL) requer medicação ou apenas ajuste na dieta?",
      "Qual é o tempo ideal para manter a suplementação de Vitamina D3?",
      "Preciso de algum exame específico complementar para a prática de corrida ao ar livre?",
      "Qual a periodicidade recomendada para meu próximo retorno?"
    ]
  });

  const consultations = medicalRecords.filter(r => r.type === 'Consulta' || r.type === 'Procedimento');

  const handleGeneratePrep = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPrep(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/gemini/prep-consultation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          doctorName: prepDoctor,
          specialty: prepSpecialty,
          reason: prepReason,
          userContext: {
            userProfile,
            recentExams: exams.slice(0, 3),
            activeMedications: medications.filter(m => m.active)
          }
        })
      });

      const data = await response.json();
      if (data.success && data.result) {
        setPrepResult(data.result);
      }
    } catch (err) {
      console.error("Erro ao gerar preparação:", err);
    } finally {
      setIsLoadingPrep(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Continuidade do Cuidado</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Registro de Consultas & Preparador de Consultas</h1>
          <p className="text-xs text-slate-300 mt-1">
            Organize suas consultas médicas e utilize Inteligência Artificial para gerar roteiros personalizados e perguntas inteligentes para a próxima consulta.
          </p>
        </div>
      </div>

      {/* AI Consultation Preparation Box */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-teal-500/30 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2 text-teal-300">
          <Stethoscope className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-white">Assistente de Preparação para Consulta Médica</h2>
        </div>

        <form onSubmit={handleGeneratePrep} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Médico / Profissional</label>
            <input
              type="text"
              required
              value={prepDoctor}
              onChange={(e) => setPrepDoctor(e.target.value)}
              placeholder="Ex: Dr. Roberto Mendonça"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Especialidade Médica</label>
            <input
              type="text"
              required
              value={prepSpecialty}
              onChange={(e) => setPrepSpecialty(e.target.value)}
              placeholder="Ex: Cardiologia / Endocrinologia"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Motivo / Sintomas Relatados</label>
            <input
              type="text"
              required
              value={prepReason}
              onChange={(e) => setPrepReason(e.target.value)}
              placeholder="Ex: Acompanhamento de rotina ou sintomas"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isLoadingPrep}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
            >
              {isLoadingPrep ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisando seu histórico e gerando roteiro...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Gerar Roteiro e Perguntas para a Consulta</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Generated Prep Output */}
        {prepResult && (
          <div className="mt-4 p-5 rounded-xl bg-slate-950 border border-teal-500/20 space-y-4">
            
            {/* Summary */}
            <div>
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider block mb-1">
                Objetivo & Foco Recomendado:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">{prepResult.summary}</p>
            </div>

            {/* Checklist */}
            {prepResult.checklist && (
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Checklist Pré-Consulta (O que levar / preparar):
                </span>
                <ul className="space-y-1.5 pl-1">
                  {prepResult.checklist.map((item, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions to ask */}
            {prepResult.suggestedQuestions && (
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <HelpCircle className="w-4 h-4 text-teal-400" />
                  Perguntas Sugeridas para Fazer ao Médico:
                </span>
                <ul className="space-y-2">
                  {prepResult.suggestedQuestions.map((q, i) => (
                    <li key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-medium">
                      "{q}"
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Consultations List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          <span>Histórico de Consultas Médicas Registradas</span>
        </h2>

        <div className="space-y-3">
          {consultations.map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    {rec.specialty}
                  </span>
                  <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">{rec.date}</span>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                {rec.doctorName} • {rec.facility}
              </p>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {rec.notes}
              </p>

              {rec.prescriptionSummary && (
                <div className="mt-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-emerald-400">Receita/Prescrição: </span>
                  {rec.prescriptionSummary}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
