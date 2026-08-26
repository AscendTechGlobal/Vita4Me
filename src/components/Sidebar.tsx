import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Activity,
  Calendar,
  Pill,
  Droplet,
  MessageSquare,
  Settings,
  ShieldCheck,
  Crown,
  X
} from "lucide-react";

export type ActiveTab =
  | "overview"
  | "exams"
  | "indicators"
  | "timeline"
  | "medications"
  | "habits"
  | "chat"
  | "settings";

export interface NavItemConfig {
  id: ActiveTab;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isNew?: boolean;
}

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenBillingModal: () => void;
  examsCount: number;
  medicationsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  onOpenBillingModal,
  examsCount,
  medicationsCount,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItemConfig[] = [
    { id: "overview", label: "Visão Geral 360°", path: "/app", icon: LayoutDashboard },
    { id: "exams", label: "Central de Exames (IA)", path: "/app/exames", icon: FileText, badge: examsCount },
    { id: "indicators", label: "Painel de Indicadores", path: "/app/indicadores", icon: Activity },
    { id: "timeline", label: "Linha do Tempo Médica", path: "/app/linha-do-tempo", icon: Calendar },
    { id: "medications", label: "Medicamentos & Lembretes", path: "/app/medicamentos", icon: Pill, badge: medicationsCount },
    { id: "habits", label: "Rotina & Bem-estar", path: "/app/rotina", icon: Droplet },
    { id: "chat", label: "Assistente IA Vita4Me", path: "/app/assistente", icon: MessageSquare, isNew: true },
    { id: "settings", label: "Configurações & Conta", path: "/app/configuracoes", icon: Settings },
  ];

  const isItemActive = (item: NavItemConfig) => {
    if (item.id === "overview") {
      return location.pathname === "/app" || location.pathname === "/app/";
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      {/* Backdrop mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <Link to="/app" className="flex items-center gap-2.5 overflow-hidden group">
              <img
                src="/logo-icon-transparent.png"
                alt="Vita4Me Logo"
                className="h-8 w-auto object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center leading-none">
                  vita<span className="text-emerald-500 font-extrabold">4</span>me
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                  Prontuário Digital & IA
                </span>
              </div>
            </Link>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 font-bold">
                      {item.badge}
                    </span>
                  )}

                  {item.isNew && (
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-black">
                      IA
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Upgrade Banner in Bottom Sidebar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-950 border border-emerald-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Vita4Me Family
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                20% OFF
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Centralize exames e medicamentos de toda a sua família com Assistente de IA incluído.
            </p>
            <button
              onClick={onOpenBillingModal}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Ver Planos
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
            <span>Privacidade & Dados Criptografados</span>
          </div>
        </div>
      </aside>
    </>
  );
};
