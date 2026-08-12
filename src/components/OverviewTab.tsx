import React from 'react';
import { 
  Activity, 
  FileText, 
  Sparkles, 
  Droplet, 
  Moon, 
  Smile, 
  Pill, 
  Syringe, 
  Stethoscope, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Plus
} from 'lucide-react';
import { 
  UserProfile, 
  Exam, 
  MedicalRecord, 
  MetricEntry, 
  Medication, 
  Vaccine, 
  DailyHabits 
} from '../types';

interface OverviewTabProps {
  userProfile: UserProfile;
  exams: Exam[];
  medicalRecords: MedicalRecord[];
  metrics: MetricEntry[];
  medications: Medication[];
  vaccines: Vaccine[];
  dailyHabits: DailyHabits;
  onNavigateTab: (tab: any) => void;
  onOpenTranslateExam: (exam: Exam) => void;
  onUpdateWater: (amountMl: number) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  userProfile,
  exams,
  medicalRecords,
  metrics,
  medications,
  vaccines,
  dailyHabits,
  onNavigateTab,
  onOpenTranslateExam,
  onUpdateWater
}) => {
  const activeMeds = medications.filter(m => m.active);
  const pendingVaccines = vaccines.filter(v => v.status === 'Pendente');
  const recentExams = exams.slice(0, 3);

  // Latest key metric values
  const latestLdl = metrics.filter(m => m.type === 'colesterol_ldl').slice(-1)[0];
  const latestBp = metrics.filter(m => m.type === 'pressao_arterial').slice(-1)[0];
  const latestGlucose = metrics.filter(m => m.type === 'glicemia').slice(-1)[0];
  const latestVitD = metrics.filter(m => m.type === 'vitamina_d').slice(-1)[0];

  return (
    <div className="space-y-6">
      
      {/* Welcome & Health Status Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Resumo Inteligente HealthAI</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Olá, {userProfile.name.split(' ')[0]}! Sua saúde está organizada.
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Todos os seus {exams.length} exames, receitas, histórico de consultas e hábitos diários estão centralizados e traduzidos por IA em uma linha do tempo única.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('assistant')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Pergunte à IA HealthAI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Health Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Pressão Arterial */}
        <div 
          onClick={() => onNavigateTab('metrics')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Pressão Arterial</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {latestBp ? `${latestBp.value}/${latestBp.valueSecondary}` : '120/80'}
            </span>
            <span className="text-xs text-slate-400">mmHg</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Nível Ideal</span>
          </div>
        </div>

        {/* Glicemia em Jejum */}
        <div 
          onClick={() => onNavigateTab('metrics')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Glicemia Jejum</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {latestGlucose ? latestGlucose.value : '92'}
            </span>
            <span className="text-xs text-slate-400">mg/dL</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Normal (70-99)</span>
          </div>
        </div>

        {/* Colesterol LDL */}
        <div 
          onClick={() => onNavigateTab('metrics')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Colesterol LDL</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-200">
              {latestLdl ? latestLdl.value : '138'}
            </span>
            <span className="text-xs text-slate-400">mg/dL</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Atenção (&lt;100 ideal)</span>
          </div>
        </div>

        {/* Vitamina D */}
        <div 
          onClick={() => onNavigateTab('metrics')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Vitamina D (25-OH)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-200">
              {latestVitD ? latestVitD.value : '28.5'}
            </span>
            <span className="text-xs text-slate-400">ng/mL</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Suplementação em uso</span>
          </div>
        </div>

      </div>

      {/* 2-Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols wide): Exams Spotlight & Habits */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Exam & AI Translation Spotlight */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Central de Exames Recentes</h2>
              </div>
              <button
                onClick={() => onNavigateTab('exams')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Ver todos ({exams.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentExams.map((exam) => (
                <div 
                  key={exam.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{exam.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          exam.statusAlert === 'Normal'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {exam.statusAlert}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {exam.laboratory} • {exam.date} • {exam.doctorName}
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenTranslateExam(exam)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/20 flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>Traduzir com IA</span>
                    </button>
                  </div>

                  {/* Summary Snippet */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200">Resumo IA: </span>
                    {exam.summary}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Habits Quick Logger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Rotina de Bem-estar Hoje</h2>
              </div>
              <button
                onClick={() => onNavigateTab('habits')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Registrar hábitos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Water Tracker */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-blue-400" /> Água
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {dailyHabits.waterIntakeMl} / {dailyHabits.waterGoalMl} ml
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (dailyHabits.waterIntakeMl / dailyHabits.waterGoalMl) * 100)}%` }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateWater(250)}
                    className="flex-1 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/20 text-center transition-colors"
                  >
                    +250ml
                  </button>
                  <button
                    onClick={() => onUpdateWater(500)}
                    className="flex-1 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/20 text-center transition-colors"
                  >
                    +500ml
                  </button>
                </div>
              </div>

              {/* Sleep Tracker */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-indigo-400" /> Sono
                  </span>
                  <span className="text-xs text-indigo-300 font-semibold">{dailyHabits.sleepQuality}</span>
                </div>
                <p className="text-xl font-bold text-white mb-1">{dailyHabits.sleepHours}h <span className="text-xs font-normal text-slate-400">dormidas</span></p>
                <p className="text-[11px] text-slate-400">Meta recomendada: 7.5 - 8h</p>
              </div>

              {/* Mood & Activity */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-emerald-400" /> Humor & Atividade
                  </span>
                  <span className="text-xs text-emerald-300 font-semibold">{dailyHabits.mood}</span>
                </div>
                <p className="text-xl font-bold text-white mb-1">{dailyHabits.physicalActivityMins} min <span className="text-xs font-normal text-slate-400">exercício</span></p>
                <p className="text-[11px] text-slate-400 truncate">{dailyHabits.activityType}</p>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column (1 col wide): Active Medications & Reminders / Vaccines */}
        <div className="space-y-6">
          
          {/* Active Medications & Lembretes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Medicamentos Ativos</h2>
              </div>
              <button
                onClick={() => onNavigateTab('medications')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Ver todos
              </button>
            </div>

            <div className="space-y-3">
              {activeMeds.map((med) => (
                <div key={med.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{med.name}</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {med.dosage}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{med.timesOfDay.join(', ')} ({med.frequency})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    {med.purpose}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Vaccines & Next Appointments */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Alertas de Vacina</h2>
              </div>
              <button
                onClick={() => onNavigateTab('vaccines')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Carteira
              </button>
            </div>

            {pendingVaccines.length > 0 ? (
              <div className="space-y-2">
                {pendingVaccines.map((vax) => (
                  <div key={vax.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-200">{vax.name}</span>
                      <span className="text-[10px] font-bold text-amber-300 uppercase">Pendente</span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Previsão: {vax.dueDate || 'A agendar'} • {vax.doseInfo}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Todas as vacinas registradas estão em dia!</p>
            )}
          </div>

          {/* Consultation Preparation Promo */}
          <div className="bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-800/50 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold mb-2">
              <Stethoscope className="w-4 h-4 text-teal-400" />
              <span>Próxima Consulta Médica?</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Prepare sua consulta com o Assistente HealthAI
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Gere automaticamente um checklist e a lista ideal de perguntas sobre seu histórico para fazer ao médico.
            </p>
            <button
              onClick={() => onNavigateTab('appointments')}
              className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              Preparar Consulta Agora
            </button>
          </div>

        </div>

      </div>

      {/* Chronological Medical History Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Linha do Tempo de Saúde Permanente</h2>
          </div>
          <span className="text-xs text-slate-400">Histórico vitalício integrado</span>
        </div>

        <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 my-2">
          {medicalRecords.map((rec) => (
            <div key={rec.id} className="relative group">
              {/* Dot on timeline */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {rec.type}
                    </span>
                    <span className="text-sm font-bold text-white">{rec.title}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{rec.date}</span>
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  {rec.doctorName} ({rec.specialty}) • {rec.facility}
                </p>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {rec.notes}
                </p>

                {rec.diagnosis && (
                  <div className="mt-2 text-xs text-emerald-300 font-medium">
                    <span className="text-slate-400 font-normal">Diagnóstico/CID: </span>{rec.diagnosis}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
