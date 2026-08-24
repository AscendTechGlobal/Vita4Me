import React from "react";
import { 
  Heart, 
  Activity, 
  FileText, 
  Pill, 
  Droplet, 
  Calendar, 
  Bot, 
  ArrowRight, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Clock,
  ShieldCheck,
  Plus
} from "lucide-react";
import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from "../types";
import { ActiveTab } from "./Sidebar";

interface DashboardViewProps {
  activeMember: FamilyMember | null;
  exams: LabExam[];
  indicators: HealthIndicator[];
  medications: Medication[];
  records: HealthRecord[];
  todayHabit: DailyHabit;
  onNavigate: (tab: ActiveTab) => void;
  onOpenExportDossierModal: () => void;
  onOpenOnboarding?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeMember,
  exams,
  indicators,
  medications,
  records,
  todayHabit,
  onNavigate,
  onOpenExportDossierModal,
  onOpenOnboarding,
}) => {
  const activeMeds = medications.filter(m => m.is_active);
  const recentExams = exams.slice(0, 3);

  // Quick vital indicators
  const glycemia = indicators.filter(i => i.name === 'Glicemia')[0];
  const cholesterol = indicators.filter(i => i.name === 'Colesterol Total')[0];
  const vitD = indicators.filter(i => i.name === 'Vitamina D')[0];
  const systolic = indicators.filter(i => i.name === 'Pressão Sistólica')[0];
  const diastolic = indicators.filter(i => i.name === 'Pressão Diastólica')[0];
  const bp = indicators.filter(i => i.name === 'Pressão Arterial')[0];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Clinical Welcome Hero Banner */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Prontuário Médico Digital &bull; {activeMember?.name || 'Titular'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              Sua saúde centralizada e explicada com clareza
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Acompanhe laudos laboratoriais, indicadores vitais, receitas e sua linha do tempo médica contínua em um ambiente 100% seguro.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <span>📋 Anamnese Inicial</span>
              </button>
            )}

            <button
              onClick={onOpenExportDossierModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Dossiê PDF</span>
            </button>

            <button
              onClick={() => onNavigate('chat')}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Assistente Clínico</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Vital Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Glicemia */}
        <div 
          onClick={() => onNavigate('indicators')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-2xl space-y-2 transition cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Glicemia de Jejum</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-950 dark:text-white font-mono">
              {glucose ? glucose.value : '92'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{glucose?.unit || 'mg/dL'}</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Nível ótimo (70 - 99 mg/dL)
          </span>
        </div>

        {/* Colesterol LDL */}
        <div 
          onClick={() => onNavigate('indicators')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-2xl space-y-2 transition cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Colesterol LDL</span>
            <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-950 dark:text-white font-mono">
              {ldl ? ldl.value : '112'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{ldl?.unit || 'mg/dL'}</span>
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Atenção preventiva (&lt; 100 mg/dL)
          </span>
        </div>

        {/* Pressão Arterial */}
        <div 
          onClick={() => onNavigate('indicators')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-2xl space-y-2 transition cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pressão Arterial</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-950 dark:text-white font-mono">
              {bp ? bp.value : '120/80'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{bp?.unit || 'mmHg'}</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Faixa ideal
          </span>
        </div>

        {/* Vitamina D */}
        <div 
          onClick={() => onNavigate('indicators')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-2xl space-y-2 transition cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Vitamina D (25-OH)</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-950 dark:text-white font-mono">
              {vitD ? vitD.value : '42.0'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{vitD?.unit || 'ng/mL'}</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Nível ótimo (30 - 60 ng/mL)
          </span>
        </div>

        {/* Pressão Arterial */}
        <div 
          onClick={() => onNavigate('indicators')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-2xl space-y-2 transition cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pressão Arterial</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-950 dark:text-white font-mono">
              {systolic && diastolic ? `${systolic.value}/${diastolic.value}` : '120/80'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">mmHg</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Pressão normal ótima
          </span>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Latest Exams & AI Translations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Últimos Exames & Tradução Clínica</span>
            </h2>
            <button
              onClick={() => onNavigate('exams')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos ({exams.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentExams.map(exam => (
              <div 
                key={exam.id}
                onClick={() => onNavigate('exams')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-2xl space-y-3 transition cursor-pointer group shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase font-mono">
                      {exam.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {exam.title}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {exam.exam_date}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold block mb-1">Explicação em Linguagem Didática:</strong>
                  {exam.ai_simple_translation || exam.ai_summary}
                </p>

                {/* Findings chips */}
                {exam.ai_key_findings && exam.ai_key_findings.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {exam.ai_key_findings.slice(0, 3).map((f, idx) => (
                      <span 
                        key={idx} 
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${
                          f.status === 'normal'
                            ? "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                        }`}
                      >
                        <strong>{f.parameter}:</strong> {f.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Active Medications & Daily Habits */}
        <div className="space-y-6">
          {/* Active Medications Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Medicamentos em Uso</span>
              </h3>
              <button
                onClick={() => onNavigate('medications')}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-bold cursor-pointer"
              >
                Gerenciar
              </button>
            </div>

            <div className="space-y-2.5">
              {activeMeds.map(med => (
                <div key={med.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-xs text-slate-900 dark:text-white block">{med.name}</strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{med.dosage} &bull; {med.frequency}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-mono font-bold shrink-0">
                    {med.schedule_times[0] || 'Ativo'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Habits Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Droplet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Rotina de Hoje</span>
              </h3>
              <button
                onClick={() => onNavigate('habits')}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-bold cursor-pointer"
              >
                Editar
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Água</span>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">{todayHabit.water_ml} ml</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Sono</span>
                <div className="text-base font-black text-slate-900 dark:text-white font-mono">{todayHabit.sleep_hours}h</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Treino</span>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">{todayHabit.exercise_minutes} min</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
