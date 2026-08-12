import React from 'react';
import { 
  Activity, 
  Sparkles, 
  User, 
  Plus, 
  Share2, 
  Building2, 
  ShieldCheck, 
  Search,
  Bell
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  userProfile: UserProfile;
  onOpenAddModal: () => void;
  onOpenShareModal: () => void;
  onOpenInstitutionalModal: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  onOpenAddModal,
  onOpenShareModal,
  onOpenInstitutionalModal,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <header id="healthai-navbar" className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-4 lg:px-8 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Logo & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                Health<span className="text-emerald-400">AI</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {userProfile.plan}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Your Health. Organized. For Life.
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden md:block relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar exames, consultas, remédios ou indicadores..."
            className="w-full bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700 focus:border-emerald-500/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>

        {/* Quick Actions & Profile */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-open-institutional"
            onClick={onOpenInstitutionalModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            title="Conheça o Manifesto, Fundador e Visão HealthAI"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sobre HealthAI</span>
          </button>

          <button
            id="btn-open-share-modal"
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            title="Compartilhar histórico seguro para consulta médica"
          >
            <Share2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Compartilhar Histórico</span>
          </button>

          <button
            id="btn-open-add-modal"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Registre</span>
          </button>

          {/* User Profile Info */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
              EW
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-none">{userProfile.name}</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{userProfile.age} anos • {userProfile.bloodType}</p>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
