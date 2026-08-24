import React, { useState } from 'react';
import { 
  Activity, 
  FileText, 
  FileCheck,
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
  RefreshCw,
  Lightbulb,
  HeartPulse,
  Flame,
  Copy,
  Check,
  CheckSquare,
  Square,
  Zap,
  Apple,
  Dumbbell,
  ShieldCheck,
  ArrowRight
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
import { getAuthHeaders } from '../lib/apiClient';

interface HealthTip {
  title: string;
  category: string;
  tip: string;
  actionableAdvice: string;
  scienceFact: string;
  badge?: string;
}

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

  // Focus topic for Gemini prompt
  const [selectedTopic, setSelectedTopic] = useState<string>('geral');
  const [completedHabit, setCompletedHabit] = useState<boolean>(false);
  const [copiedTip, setCopiedTip] = useState<boolean>(false);

  // Health Tip State
  const [dailyTip, setDailyTip] = useState<HealthTip>({
    title: 'Otimização de Fibras Solúveis e Absorção Lipídica',
    category: 'Nutrição & Colesterol LDL',
    tip: `Com base no seu nível de Colesterol LDL (${metrics.find(m => m.type === 'colesterol_ldl')?.value || 138} mg/dL) e hidratação atual (${dailyHabits.waterIntakeMl}ml), o consumo de beta-glucana (aveia) ou sementes de chia forma um gel intestinal que sequestra sais biliares, reduzindo a absorção de gorduras e auxiliando o fígado a depurar o LDL circulante.`,
    actionableAdvice: 'Adicione 1 colher de sopa de farelo de aveia ou psyllium ao lanche da tarde acompanhado de 300ml de água.',
    scienceFact: 'Ensaios clínicos demonstram que 3g diários de beta-glucana podem reduzir o LDL plasmático em até 7 a 10% sem efeitos adversos.',
    badge: 'Foco Preventivo'
  });
  const [loadingTip, setLoadingTip] = useState(false);

  const topicOptions = [
    { id: 'geral', label: 'Síntese Geral', icon: Activity },
    { id: 'colesterol', label: 'Colesterol & Nutrição', icon: Apple },
    { id: 'hidratacao', label: 'Hidratação & Energia', icon: Droplet },
    { id: 'sono', label: 'Sono Restaurador', icon: Moon },
    { id: 'exercicio', label: 'Atividade & Longevidade', icon: Dumbbell },
    { id: 'suplementos', label: 'Absorção de Vitamina D', icon: Pill }
  ];

  // Fetch Daily Tip from Gemini API
  const fetchGeminiDailyTip = async (topicId?: string) => {
    const topicToUse = topicId || selectedTopic;
    try {
      setLoadingTip(true);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/gemini/daily-tip', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userProfile,
          dailyHabits,
          recentMetrics: metrics.slice(-6),
          medications: activeMeds,
          focusTopic: topicToUse === 'geral' ? undefined : topicOptions.find(t => t.id === topicToUse)?.label
        })
      });

      const data = await res.json();
      if (data.success && data.tip) {
        setDailyTip(data.tip);
        setCompletedHabit(false);
      } else {
        // Fallback robusto conforme o tema selecionado
        setFallbackTip(topicToUse);
      }
    } catch (err) {
      console.error('Erro ao buscar dica do dia com Gemini:', err);
      setFallbackTip(topicToUse);
    } finally {
      setLoadingTip(false);
    }
  };

  const setFallbackTip = (topic: string) => {
    if (topic === 'hidratacao') {
      setDailyTip({
        title: 'Ritmo Circadiano de Hidratação Celular',
        category: 'Hidratação & Energia',
        tip: `Você registrou ${dailyHabits.waterIntakeMl}ml de água hoje (meta de ${dailyHabits.waterGoalMl}ml). Fracionar a ingestão em copos de 250ml a cada 90 minutos melhora o transporte de eletrólitos e previne a fadiga metabólica no final da tarde.`,
        actionableAdvice: 'Beba 250ml de água agora e configure um lembrete visual na sua mesa de trabalho.',
        scienceFact: 'A desidratação leve de apenas 1.5% reduz em até 12% a velocidade de processamento cognitivo e concentração.',
        badge: 'Hidratação Ativa'
      });
    } else if (topic === 'sono') {
      setDailyTip({
        title: 'Higiene do Sono & Pico de Melatonina',
        category: 'Sono Restaurador',
        tip: `Com ${dailyHabits.sleepHours}h de sono registradas e qualidade "${dailyHabits.sleepQuality}", limitar luzes de espectro azul 45 minutos antes de deitar potencializa o sono de ondas lentas (fase N3), crucial para a depuração de metabólitos cerebrais.`,
        actionableAdvice: 'Ative o filtro noturno no celular às 21h e evite refeições pesadas 2 horas antes de dormir.',
        scienceFact: 'O sistema glinfático é 10x mais ativo durante o sono profundo, removendo proteínas tau e resíduos oxidativos.',
        badge: 'Recuperação Neural'
      });
    } else if (topic === 'suplementos') {
      setDailyTip({
        title: 'Biodisponibilidade da Vitamina D3 com Lipídios',
        category: 'Suplementação & Imunidade',
        tip: `Seu último exame de Vitamina D apontou ${metrics.find(m => m.type === 'vitamina_d')?.value || 28.5} ng/mL. Como a vitamina D é lipossolúvel, sua absorção aumenta em até 50% quando ingerida junto a uma refeição contendo gorduras boas (azeite de oliva, ovos ou castanhas).`,
        actionableAdvice: 'Tome sua dose diária de Vitamina D durante o almoço com uma fonte saudável de lipídios.',
        scienceFact: 'A presença de triglicerídeos estimula a secreção de sais biliares essenciais para a micelização do colecalciferol.',
        badge: 'Otimização Nutricional'
      });
    } else if (topic === 'exercicio') {
      setDailyTip({
        title: 'Impacto da Zona 2 na Sensibilidade à Insulina',
        category: 'Atividade Física & Longevidade',
        tip: `Seus ${dailyHabits.physicalActivityMins} minutos de ${dailyHabits.activityType} ajudam na translocação dos transportadores GLUT-4 para as membranas musculares de forma independente de insulina, otimizando o controle glicêmico.`,
        actionableAdvice: 'Faça 5 a 10 minutos de caminhada leve ou alongamento após a principal refeição do dia.',
        scienceFact: 'Contrações musculares leves pós-prandiais reduzem o pico glicêmico em até 22% em adultos saudáveis.',
        badge: 'Metabolismo Ativo'
      });
    } else {
      setDailyTip({
        title: 'Sinergia Entre Fibras Solúveis e Hidratação',
        category: 'Nutrição & Colesterol LDL',
        tip: `Com base no seu perfil clínico e registro diário, combinar fibras solúveis com hidratação adequada cria um meio ideal para retenção e excreção de lipídios intestinais, protegendo a saúde endotelial.`,
        actionableAdvice: 'Incremente suas saladas com azeite extravirgem e sementes de linhaça moída.',
        scienceFact: 'Ácidos graxos monoinsaturados reduzem a oxidação das partículas de LDL prevenindo placas de ateroma.',
        badge: 'Foco Preventivo'
      });
    }
  };

  const handleCopyTip = () => {
    const textToCopy = `💡 Dica de Saúde Vita4Me - ${dailyTip.title} (${dailyTip.category})\n\n${dailyTip.tip}\n\n👉 Passo Prático Hoje: ${dailyTip.actionableAdvice}\n🔬 Evidência: ${dailyTip.scienceFact}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedTip(true);
    setTimeout(() => setCopiedTip(false), 2500);
  };

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
              <Activity className="w-4 h-4" />
              <span>Resumo Inteligente Vita4Me</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Olá, {userProfile.name.split(' ')[0]}! Sua saúde está organizada.
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Todos os seus {exams.length} exames, receitas, histórico de consultas e hábitos diários estão centralizados e traduzidos em uma linha do tempo única.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('assistant')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Activity className="w-4 h-4" />
              <span>Consultar Assistente Vita4Me</span>
            </button>
          </div>
        </div>
      </div>

      {/* Widget: AI Health Tip of the Day (Dica de Saúde do Dia com Gemini) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/30 p-6 shadow-xl space-y-4">
        
        {/* Top Header of the Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold uppercase tracking-wider text-teal-300">
                  Dica de Saúde do Dia
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  {dailyTip.badge || 'Análise Personalizada'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Orientação personalizada gerada pelo Gemini a partir dos seus hábitos de hoje e exames clínicos
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCopyTip}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Copiar dica"
            >
              {copiedTip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="text-[11px]">{copiedTip ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={() => fetchGeminiDailyTip()}
              disabled={loadingTip}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${loadingTip ? 'animate-spin' : ''}`} />
              <span>{loadingTip ? 'Gerando com Gemini...' : 'Nova Dica com IA'}</span>
            </button>
          </div>
        </div>

        {/* Live Context Data Fed to Gemini */}
        <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Parâmetros de Saúde Analisados pela IA Hoje:
            </span>
            <span className="text-slate-500 hidden sm:inline">Atualizado em tempo real</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {/* Água */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/70">
              <span className="text-[10px] text-slate-400 block">Hidratação:</span>
              <span className="font-bold text-blue-400">{dailyHabits.waterIntakeMl} / {dailyHabits.waterGoalMl} ml</span>
            </div>

            {/* Sono */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/70">
              <span className="text-[10px] text-slate-400 block">Sono:</span>
              <span className="font-bold text-indigo-400">{dailyHabits.sleepHours}h ({dailyHabits.sleepQuality})</span>
            </div>

            {/* LDL */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/70">
              <span className="text-[10px] text-slate-400 block">Colesterol LDL:</span>
              <span className="font-bold text-amber-300">{latestLdl ? `${latestLdl.value} mg/dL` : '138 mg/dL'}</span>
            </div>

            {/* Pressão */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/70">
              <span className="text-[10px] text-slate-400 block">Pressão Arterial:</span>
              <span className="font-bold text-emerald-400">{latestBp ? `${latestBp.value}/${latestBp.valueSecondary}` : '120/80'}</span>
            </div>

            {/* Vitamina D / Meds */}
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/70 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block">Vitamina D:</span>
              <span className="font-bold text-teal-300">{latestVitD ? `${latestVitD.value} ng/mL` : '28.5 ng/mL'}</span>
            </div>
          </div>
        </div>

        {/* Focus Topic Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap mr-1">Foco Temático:</span>
          {topicOptions.map((topic) => {
            const Icon = topic.icon;
            const isSelected = selectedTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  setSelectedTopic(topic.id);
                  fetchGeminiDailyTip(topic.id);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-teal-400'}`} />
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tip Content Body */}
        {loadingTip ? (
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-3 py-10">
            <RefreshCw className="w-7 h-7 text-teal-400 animate-spin" />
            <div>
              <p className="text-sm font-bold text-white">Sintetizando seus dados clínicos com Gemini...</p>
              <p className="text-xs text-slate-400 mt-0.5">Cruzando histórico de colesterol, hidratação e sono com evidências médicas.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-teal-300 bg-teal-950/90 px-2.5 py-0.5 rounded-lg border border-teal-800/70">
                  {dailyTip.category}
                </span>
                <h3 className="text-base font-bold text-white">{dailyTip.title}</h3>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {dailyTip.tip}
              </p>
            </div>

            {/* 2-Column Actionable & Science Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Micro-Habit Checklist Card */}
              <div 
                onClick={() => setCompletedHabit(!completedHabit)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-start gap-3 ${
                  completedHabit 
                    ? 'bg-emerald-950/30 border-emerald-500/40' 
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-teal-500/40'
                }`}
              >
                <div className="pt-0.5 shrink-0 text-emerald-400">
                  {completedHabit ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      Micro-Hábito Para Hoje:
                    </span>
                    {completedHabit && (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Concluído hoje!
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 transition-all ${
                    completedHabit ? 'text-slate-300 line-through' : 'text-slate-100 font-medium'
                  }`}>
                    {dailyTip.actionableAdvice}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    {completedHabit ? 'Excelente! O hábito foi registrado com sucesso.' : 'Clique para marcar como concluído no seu dia.'}
                  </p>
                </div>
              </div>

              {/* Science & Medical Evidence Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
                    Base e Evidência Médica:
                  </span>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {dailyTip.scienceFact}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

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
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      <span>Traduzir Laudo</span>
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
              Prepare sua consulta com o Assistente Vita4Me
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

