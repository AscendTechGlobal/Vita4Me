import React from "react";
import { 
  Heart, 
  Users, 
  Crown, 
  Download, 
  User, 
  LogOut, 
  LogIn, 
  Menu,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { FamilyMember } from "../types";

interface NavbarProps {
  onOpenMobileMenu: () => void;
  activeMember: FamilyMember | null;
  onOpenFamilyModal: () => void;
  onOpenBillingModal: () => void;
  onOpenAuthModal: () => void;
  onOpenExportDossierModal: () => void;
  onToggleLandingPage?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileMenu,
  activeMember,
  onOpenFamilyModal,
  onOpenBillingModal,
  onOpenAuthModal,
  onOpenExportDossierModal,
  onToggleLandingPage,
}) => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between z-30 sticky top-0 transition-colors shadow-xs">
      {/* Left: Mobile Toggle & Active Member Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Member / Profile Pill */}
        {profile?.plan_tier === 'family' ? (
          <button
            onClick={onOpenFamilyModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 text-xs text-slate-800 dark:text-white transition cursor-pointer group shadow-xs"
            title="Alternar perfil familiar"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold flex items-center justify-center text-[10px]">
              {activeMember?.name?.charAt(0) || profile?.full_name?.charAt(0) || 'P'}
            </div>
            <div className="text-left">
              <span className="block font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition leading-tight">
                {activeMember?.name || profile?.full_name || 'Perfil Titular'}
              </span>
              <span className="block text-[9px] text-slate-500 dark:text-slate-400">
                {activeMember?.relationship || 'Titular'} &bull; Alternar
              </span>
            </div>
            <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 ml-1" />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white shadow-xs">
            <div className="w-6 h-6 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold flex items-center justify-center text-[10px]">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="text-left">
              <span className="block font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {profile?.full_name || user?.email?.split('@')[0] || 'Titular'}
              </span>
              <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                Prontuário Individual
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Landing Page Link Button */}
        {onToggleLandingPage && (
          <button
            onClick={onToggleLandingPage}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition cursor-pointer shadow-xs"
            title="Ver Landing Page Institucional"
          >
            <span>Ver Site</span>
          </button>
        )}

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Export Medical Dossier Button */}
        <button
          onClick={onOpenExportDossierModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition cursor-pointer shadow-xs"
          title="Gerar Dossiê Médico em PDF para Consultas"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Dossiê PDF</span>
        </button>

        {/* Plan Upgrade Pill */}
        <button
          onClick={onOpenBillingModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
        >
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline uppercase text-[10px] tracking-wider">
            Plano {profile?.plan_tier === 'family' ? 'FAMÍLIA' : 'INDIVIDUAL'}
          </span>
          <span className="md:hidden">Planos</span>
        </button>

        {/* User Auth Menu */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden lg:block text-right text-xs">
              <span className="block font-bold text-slate-900 dark:text-white leading-tight">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Prontuário Ativo</span>
            </div>
            <button
              onClick={() => signOut()}
              title="Sair da Conta"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar / Cadastrar</span>
          </button>
        )}
      </div>
    </header>
  );
};
