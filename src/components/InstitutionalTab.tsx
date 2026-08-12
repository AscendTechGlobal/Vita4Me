import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  Award, 
  Check, 
  Globe, 
  Target, 
  Lock, 
  HeartPulse,
  ChevronRight
} from 'lucide-react';
import { UserProfile } from '../types';

interface InstitutionalTabProps {
  userProfile: UserProfile;
}

export const InstitutionalTab: React.FC<InstitutionalTabProps> = ({ userProfile }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Dossier Institucional Completo • Versão 1.0</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            HEALTH<span className="text-emerald-400">.AI</span>
          </h1>

          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Corporate Profile & Institutional Dossier. Uma plataforma inteligente criada para organizar, explicar e preservar toda a história clínica e de bem-estar de uma pessoa durante a vida toda.
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800">
            <span>Fundador: <strong className="text-white">Eduardo Weber</strong></span>
            <span>•</span>
            <span>Slogan: <strong className="text-emerald-400">Your Health. Organized. For Life.</strong></span>
          </div>
        </div>
      </div>

      {/* 1. Carta Institucional & Manifesto */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>1. Carta Institucional & Manifesto HealthAI</span>
        </h2>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            A saúde é um dos ativos mais importantes da vida. Entretanto, mesmo vivendo em uma era marcada pela tecnologia, milhões de pessoas ainda mantêm sua própria história médica espalhada entre hospitais, clínicas, laboratórios, aplicativos diferentes e documentos físicos.
          </p>
          <p>
            Resultados de exames são esquecidos. Receitas médicas se perdem. Consultas deixam de ser registradas. O problema nunca foi a falta de informação, o verdadeiro desafio sempre foi organizá-la. A HealthAI nasceu para mudar essa realidade.
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-200 font-medium">
            "A HealthAI não realiza diagnósticos. Não substitui médicos. Não prescreve medicamentos. Nossa missão é organizar, explicar e apresentar informações de forma clara, responsável e segura, permitindo que cada pessoa tenha maior controle sobre sua própria jornada de saúde."
          </div>
        </div>
      </div>

      {/* 2. Missão, Visão e Valores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Missão</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Transformar a maneira como as pessoas organizam, compreendem e acompanham sua própria saúde através da combinação entre inteligência artificial, tecnologia e segurança da informação.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider">Visão</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Tornar-se uma das principais plataformas globais de gestão inteligente da saúde pessoal, conectando indivíduos e profissionais em um ecossistema seguro e centrado no paciente.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Valores</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            O usuário em primeiro lugar, privacidade absoluta, ética médica rigorosa, transparência das informações e inovação responsável.
          </p>
        </div>

      </div>

      {/* 3. Tiers de Assinatura (Section 21) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">Modelo de Assinatura Escalável</h2>
          <p className="text-xs text-slate-400 mt-1">
            Estrutura criada para atender diferentes perfis de usuários, desde a organização individual até o compartilhamento familiar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Free */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Free</span>
            <div className="text-lg font-extrabold text-white">R$ 0</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Ideal para iniciar a organização da própria saúde. Inclui armazenamento de documentos e histórico básico.
            </p>
          </div>

          {/* Plus (Current) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500 space-y-2 relative">
            <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500 text-slate-950">
              Plano Atual
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase">Plus</span>
            <div className="text-lg font-extrabold text-white">R$ 29<span className="text-xs font-normal text-slate-400">/mês</span></div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Recursos avançados de IA (Tradutor de Exames, Assistente Chatbot), dashboards completos de indicadores.
            </p>
          </div>

          {/* Family */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-teal-400 uppercase">Family</span>
            <div className="text-lg font-extrabold text-white">R$ 59<span className="text-xs font-normal text-slate-400">/mês</span></div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Centraliza a saúde de toda a família (até 6 membros) mantendo perfis individuais e gestão compartilhada.
            </p>
          </div>

          {/* Professional */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 opacity-75">
            <span className="text-xs font-bold text-amber-400 uppercase">Professional</span>
            <div className="text-xs font-bold text-slate-400">Roadmap</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Voltado para profissionais de saúde compartilharem laudos com seus pacientes com controle do usuário.
            </p>
          </div>

        </div>
      </div>

      {/* 4. Perfil do Fundador (Eduardo Weber) & Ética (Section 25 & 28) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-1 text-center md:text-left space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto md:mx-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-extrabold text-xl">
              EW
            </div>
          </div>
          <h3 className="text-base font-bold text-white">Eduardo Weber</h3>
          <p className="text-xs text-emerald-400 font-medium">Fundador da HealthAI</p>
        </div>

        <div className="md:col-span-2 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            Profissional com atuação nas áreas de tecnologia, inteligência artificial, automação, desenvolvimento de software e cibersegurança.
          </p>
          <p>
            Sua visão é utilizar tecnologia para simplificar problemas complexos e desenvolver plataformas capazes de gerar impacto positivo na vida das pessoas, garantindo que privacidade e proteção de dados sejam os pilares fundamentais.
          </p>
        </div>
      </div>

    </div>
  );
};
