import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  TrendingUp, 
  Stethoscope, 
  Pill, 
  Syringe, 
  AlertTriangle, 
  HeartPulse, 
  FolderLock, 
  Bot, 
  Building2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export type ActiveTab = 
  | 'overview' 
  | 'exams' 
  | 'metrics' 
  | 'appointments' 
  | 'medications' 
  | 'vaccines' 
  | 'allergies' 
  | 'habits' 
  | 'documents' 
  | 'assistant' 
  | 'institutional';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  examsCount: number;
  medicationsCount: number;
  vaccinesPendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  examsCount,
  medicationsCount,
  vaccinesPendingCount
}) => {
  const menuItems = [
    { id: 'overview' as ActiveTab, label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'exams' as ActiveTab, label: 'Central de Exames', icon: FileText, badge: examsCount },
    { id: 'metrics' as ActiveTab, label: 'Indicadores de Saúde', icon: TrendingUp },
    { id: 'appointments' as ActiveTab, label: 'Consultas & Preparação', icon: Stethoscope },
    { id: 'medications' as ActiveTab, label: 'Medicamentos & Lembretes', icon: Pill, badge: medicationsCount },
    { id: 'vaccines' as ActiveTab, label: 'Vacinação', icon: Syringe, badgeWarning: vaccinesPendingCount > 0 ? `${vaccinesPendingCount} pendente` : undefined },
    { id: 'allergies' as ActiveTab, label: 'Alergias & Cirurgias', icon: AlertTriangle },
    { id: 'habits' as ActiveTab, label: 'Hábitos & Bem-estar', icon: HeartPulse },
    { id: 'documents' as ActiveTab, label: 'Documentos Médicos', icon: FolderLock },
    { id: 'assistant' as ActiveTab, label: 'Assistente IA HealthAI', icon: Bot, isAi: true },
    { id: 'institutional' as ActiveTab, label: 'Sobre a HealthAI', icon: Building2 }
  ];

  return (
    <aside id="healthai-sidebar" className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Ecossistema de Saúde
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400' : item.isAi ? 'text-teal-400' : 'text-slate-400'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                  {item.badgeWarning && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badgeWarning}
                    </span>
                  )}
                  {item.isAi && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gradient-to-r from-teal-500/30 to-emerald-500/30 text-teal-300 border border-teal-500/30">
                      IA
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Banner in Sidebar */}
      <div className="mt-8 pt-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Dados Privados & Seguros</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Criptografia de ponta a ponta. A HealthAI não realiza diagnósticos e não substitui seu médico.
          </p>
        </div>
      </div>
    </aside>
  );
};
