import React, { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Activity,
  Heart,
  Bot,
  Users,
  CheckCircle2,
  ArrowRight,
  Download,
  Calendar,
  Lock,
  ChevronDown,
  Star,
  Zap,
  Clock,
  Eye,
  Check,
  HelpCircle,
  Stethoscope,
  FileCheck,
  Layers
} from "lucide-react";
import { HEALTH_PRICING_PLANS } from "../lib/stripe";
import { PricingPlan } from "../types";
import { trackEvent, trackPageView } from "../lib/analytics";
import { LegalDocumentsModal, LegalTab } from "./LegalDocumentsModal";

interface LandingPageViewProps {
  onEnterApp: () => void;
  onOpenAuthModal: () => void;
  onOpenBillingModal: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onEnterApp,
  onOpenAuthModal,
  onOpenBillingModal,
}) => {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  React.useEffect(() => {
    trackPageView('/', 'Vita4Me — Landing Page');
    trackEvent('landing_view');
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sample Interactive Translation State
  const sampleExams = [
    {
      id: "lipid",
      title: "Perfil Lipídico Completo",
      lab: "Laboratório Fleury",
      date: "14/08/2026",
      rawText: "Colesterol Total: 238 mg/dL (Desejável < 190) • LDL-C: 154 mg/dL (Ótimo < 100) • HDL-C: 46 mg/dL • Triglicerídeos: 188 mg/dL",
      translatedText: "Seu colesterol 'ruim' (LDL) e os triglicerídeos estão levemente elevados em relação à média ideal. Isso indica uma oportunidade de ajustes na alimentação e aumento de atividade física aeróbica.",
      highlights: ["LDL elevado (154 mg/dL)", "HDL protetor em nível estável", "Triglicerídeos necessitam atenção"],
      questionForDoc: "Quais desses resultados devo discutir na consulta e quais próximos passos devo perguntar ao meu médico?"
    },
    {
      id: "glycemia",
      title: "Glicemia de Jejum & Hemoglobina Glicada",
      lab: "Laboratório Dasa",
      date: "02/08/2026",
      rawText: "Glicemia em Jejum: 94 mg/dL (Ref: 70 a 99 mg/dL) • HbA1c: 5.3% (Ref: Normal < 5.7%)",
      translatedText: "Excelente notícia! Seu metabolismo de açúcar está funcionando com total estabilidade e normalidade. O risco de pré-diabetes está descartado no momento.",
      highlights: ["Glicemia dentro da faixa ótima", "Hemoglobina Glicada excelente (5.3%)", "Sensibilidade à insulina preservada"],
      questionForDoc: "Como mantenho esses níveis estáveis no próximo semestre?"
    },
    {
      id: "hemogram",
      title: "Hemograma Completo com Plaquetas",
      lab: "Hospital Sírio-Libanês",
      date: "28/07/2026",
      rawText: "Hemoglobina: 14.8 g/dL • Leucócitos: 6.400 /mm³ • Plaquetas: 245.000 /mm³",
      translatedText: "Sem sinais de anemia ou infecções ativas. Sua contagem de glóbulos vermelhos, brancos e plaquetas de coagulação está no centro da referência de saúde.",
      highlights: ["Sem anemia (Hemoglobina 14.8)", "Imunidade em equilíbrio perfeito", "Plaquetas normais"],
      questionForDoc: "Posso manter minha rotina de treinos intensos com estes índices?"
    }
  ];

  const [selectedSampleExam, setSelectedSampleExam] = useState(sampleExams[0]);

  const faqs = [
    {
      q: "O que é o Vita4Me?",
      a: "O Vita4Me é uma plataforma inteligente de prontuário pessoal e familiar. Ele centraliza todos os seus exames laboratoriais, consultas, vacinas e medicamentos em uma linha do tempo única, traduzindo termos médicos complexos para uma linguagem simples e clara por meio de tecnologia avançada."
    },
    {
      q: "Como funciona o teste grátis de 7 dias?",
      a: "Você tem acesso completo a todas as funcionalidades do plano escolhido (Individual ou Família) durante 7 dias corridos. Você pode cancelar a qualquer momento sem nenhuma cobrança."
    },
    {
      q: "O Vita4Me substitui meu médico?",
      a: "Não. O Vita4Me é uma tecnologia de letramento e organização pessoal de saúde. Nossa inteligência não faz diagnósticos, não prescreve remédios e não substitui consultas médicas. O objetivo é permitir que você chegue às suas consultas muito mais informado e preparado."
    },
    {
      q: "Como funciona a tradução de exames?",
      a: "Você faz o upload do seu laudo ou exame em PDF ou imagem. O sistema faz a leitura, extrai os biomarcadores e explica em português acessível o significado de cada item, destacando pontos de atenção e sugerindo perguntas inteligentes para você fazer ao seu médico."
    },
    {
      q: "Posso cadastrar exames da minha família inteira?",
      a: "Sim! No plano Vita4Me Família, você pode gerenciar até 5 perfis independentes para seus filhos, cônjuge ou pais idosos, com histórico clínico e lembretes de medicação individualizados em uma única conta."
    },
    {
      q: "Meus dados de saúde estão seguros?",
      a: "Absolutamente. Seus dados são protegidos com criptografia de ponta a ponta (AES-256), em total alinhamento com a LGPD e privacidade médica. Nenhum dado é compartilhado ou vendido a terceiros."
    },
    {
      q: "Como funciona o Dossiê Médico para Consultas?",
      a: "Com 1 clique, o Vita4Me gera um PDF consolidado, elegante e profissional com todo o seu histórico relevante recente (exames, remédios contínuos, alergias e notas). Você pode imprimir ou enviar no WhatsApp do seu médico antes da consulta."
    }
  ];

  return (
    <div className="min-h-screen bg-[#061F18] text-[#F3FAF6] font-sans selection:bg-[#7AC943] selection:text-[#0A3B2E] relative">
      
      {/* 1. Top Announcement Bar */}
      <div className="bg-gradient-to-r from-[#0A3B2E] via-[#126D4A] to-[#0A3B2E] border-b border-[#126D4A]/50 py-2 px-4 text-center text-xs font-semibold text-[#CDEBC5]">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#7AC943]" />
          <span><strong>Vita4Me 2.0:</strong> Tradução instantânea de exames laboratoriais e prontuário integrado disponível com 7 dias grátis.</span>
          <button 
            onClick={onOpenBillingModal}
            className="underline text-white hover:text-[#7AC943] font-bold ml-1 cursor-pointer transition"
          >
            Começar 7 Dias Grátis &rarr;
          </button>
        </span>
      </div>

      {/* 2. Floating Sticky Navbar */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-[#0A3B2E]/95 backdrop-blur-xl shadow-xl shadow-black/50 border-b border-[#126D4A]" 
          : "bg-[#0A3B2E]/85 backdrop-blur-md border-b border-[#126D4A]/40"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img
              src="/logo-icon-transparent.png"
              alt="Vita4Me Logo"
              className="h-10 w-auto object-contain hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center leading-none">
                vita<span className="text-[#7AC943] font-extrabold">4</span>me
              </span>
              <span className="text-[10px] text-[#CDEBC5] font-medium tracking-wide">
                Saúde Inteligente
              </span>
            </div>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#CDEBC5]">
            <a href="#como-funciona" className="hover:text-[#7AC943] transition">Como Funciona</a>
            <a href="#tradutor-ia" className="hover:text-[#7AC943] transition">Tradutor de Exames</a>
            <a href="#dossie-medico" className="hover:text-[#7AC943] transition">Dossiê Médico</a>
            <a href="#planos" className="hover:text-[#7AC943] transition">Planos</a>
            <a href="#seguranca" className="hover:text-[#7AC943] transition">Segurança & LGPD</a>
            <a href="#faq" className="hover:text-[#7AC943] transition">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:text-[#7AC943] hover:bg-white/5 transition cursor-pointer"
            >
              Entrar
            </button>
            <button
              onClick={onOpenBillingModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#126D4A] to-[#7AC943] hover:from-[#126D4A] hover:to-[#96DC63] text-[#0A3B2E] font-black text-xs shadow-lg shadow-[#7AC943]/20 transition-all hover:scale-[1.03] cursor-pointer flex items-center gap-1.5"
            >
              <span>Testar 7 Dias Grátis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section (Above the Fold) */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        {/* Background Static V4M Brand Watermark Grande (Posicionado mais para cima) */}
        <div className="absolute -top-10 sm:-top-16 lg:-top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] sm:h-[800px] pointer-events-none select-none z-0 flex items-start justify-center overflow-visible">
          <img
            src="/logo-icon-transparent.png"
            alt="Vita4Me V4M Logo Background"
            className="w-[750px] sm:w-[1050px] md:w-[1250px] lg:w-[1450px] max-w-none opacity-[0.11] sm:opacity-[0.13] object-contain"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0A3B2E] border border-[#7AC943]/40 text-[#7AC943] text-xs font-bold shadow-inner">
            <ShieldCheck className="w-4 h-4 text-[#7AC943]" />
            <span>PRONTUÁRIO MÉDICO DIGITAL & TRADUTOR DE EXAMES</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
            Seu histórico de saúde organizado e explicado com{" "}
            <span className="bg-gradient-to-r from-[#7AC943] via-[#CDEBC5] to-[#7AC943] bg-clip-text text-transparent">
              clareza.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#CDEBC5] max-w-2xl mx-auto leading-relaxed font-normal">
            Centralize todos os seus exames laboratoriais, traduza laudos médicos complexos para linguagem simples e gere dossiês profissionais para suas consultas em segundos.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onOpenBillingModal}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#7AC943] to-[#96DC63] hover:from-[#96DC63] hover:to-[#7AC943] text-[#0A3B2E] font-black text-sm shadow-xl shadow-[#7AC943]/25 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Começar Teste de 7 Dias Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#0A3B2E] hover:bg-[#126D4A]/60 border border-[#126D4A] hover:border-[#7AC943]/60 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-[#7AC943]" />
              <span>Acessar Prontuário</span>
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#CDEBC5]/80 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7AC943]" />
              <span>Dados protegidos com criptografia</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#7AC943]" />
              <span>Privacidade & LGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#7AC943]" />
              <span>Segurança & Ética Clínica</span>
            </div>
          </div>

          {/* 4. Interactive Hero Feature Showcase: Before & After Translation Simulator */}
          <div id="tradutor-ia" className="pt-10 max-w-5xl mx-auto">
            <div className="bg-[#0A3B2E]/90 border border-[#126D4A] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 text-left">
              
              {/* Simulator Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#126D4A] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#126D4A] border border-[#7AC943]/30 flex items-center justify-center text-[#7AC943] shadow-md">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Simulador Interativo Vita4Me
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#7AC943]/20 text-[#7AC943] border border-[#7AC943]/30">
                        SISTEMA ATIVO
                      </span>
                    </h2>
                    <p className="text-xs text-[#CDEBC5]">
                      Escolha um exame abaixo para ver como o sistema traduz jargões médicos instantaneamente:
                    </p>
                  </div>
                </div>

                {/* Sample Exam Selector Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                  {sampleExams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => setSelectedSampleExam(exam)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        selectedSampleExam.id === exam.id
                          ? "bg-[#7AC943] text-[#0A3B2E] shadow-sm font-black"
                          : "bg-[#061F18] text-[#CDEBC5] hover:bg-[#126D4A] border border-[#126D4A]"
                      }`}
                    >
                      {exam.title.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Before & After Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Antes: Laudo Tradicional Complexo */}
                <div className="bg-[#061F18] rounded-2xl p-5 border border-red-900/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      LAUDO CLÍNICO BRUTO
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedSampleExam.lab}</span>
                  </div>

                  <h3 className="font-bold text-sm text-white">{selectedSampleExam.title}</h3>
                  <div className="p-3.5 bg-black/40 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 leading-relaxed">
                    {selectedSampleExam.rawText}
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    ⚠️ Termos técnicos, números soltos e siglas que geram ansiedade e dúvidas no paciente.
                  </p>
                </div>

                {/* Depois: Tradução Clara Vita4Me */}
                <div className="bg-gradient-to-br from-[#0A3B2E] to-[#126D4A]/50 rounded-2xl p-5 border border-[#7AC943]/40 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#7AC943] flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      EXPLICAÇÃO EM LINGUAGEM SIMPLES
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#7AC943]/20 text-[#7AC943] text-[10px] font-bold">
                      VITA4ME
                    </span>
                  </div>

                  <p className="text-xs text-white leading-relaxed font-sans">
                    {selectedSampleExam.translatedText}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#CDEBC5] block">
                      Principais Destaques:
                    </span>
                    {selectedSampleExam.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#CDEBC5]">
                        <Check className="w-3.5 h-3.5 text-[#7AC943] shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-[#061F18]/80 rounded-xl border border-[#7AC943]/30 text-[11px] text-[#CDEBC5] space-y-1">
                    <strong className="text-[#7AC943] block flex items-center gap-1">
                      💡 Pergunta Sugerida para sua Consulta:
                    </strong>
                    <span>"{selectedSampleExam.questionForDoc}"</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 5. Social Proof Numbers & Statistics */}
      <section className="border-y border-[#126D4A]/40 bg-[#0A3B2E]/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-[#7AC943] block">Privacidade</span>
              <span className="text-xs text-[#CDEBC5] font-medium">Segurança & RLS Segregado</span>
            </div>

            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-white block">Tudo em 1</span>
              <span className="text-xs text-[#CDEBC5] font-medium">Histórico Centralizado</span>
            </div>

            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-[#7AC943] block">Segundos</span>
              <span className="text-xs text-[#CDEBC5] font-medium">Análise e Tradução com IA</span>
            </div>

            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-white block">7 Dias</span>
              <span className="text-xs text-[#CDEBC5] font-medium">Teste Grátis em Qualquer Plano</span>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Feature Grid (Funcionalidades Principais) */}
      <section id="como-funciona" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold text-[#7AC943] uppercase tracking-widest block">
            ECOSSISTEMA COMPLETO DE SAÚDE PESSOAL
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Tudo o que você precisa para assumir o controle da sua saúde
          </h2>
          <p className="text-sm text-[#CDEBC5] leading-relaxed">
            Desenvolvido para simplificar sua vida médica, eliminar pastas físicas perdidas e permitir decisões informadas junto aos seus profissionais de saúde.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-[#0A3B2E]/70 border border-[#126D4A] hover:border-[#7AC943]/60 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-2xl bg-[#126D4A] flex items-center justify-center text-[#7AC943] shadow-md group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Central de Exames Inteligente</h3>
            <p className="text-xs text-[#CDEBC5] leading-relaxed">
              Faça upload de laudos em PDF ou imagem. O sistema faz leitura óptica, categoriza os biomarcadores e explica os resultados de forma clara.
            </p>
          </div>

          {/* Card 2 */}
          <div id="dossie-medico" className="p-8 rounded-3xl bg-[#0A3B2E]/70 border border-[#126D4A] hover:border-[#7AC943]/60 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-2xl bg-[#126D4A] flex items-center justify-center text-[#7AC943] shadow-md group-hover:scale-110 transition-transform">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Dossiê Médico para Consultas</h3>
            <p className="text-xs text-[#CDEBC5] leading-relaxed">
              Gere um relatório consolidado e elegante em PDF com todo o seu histórico relevante para levar nas consultas com seus médicos.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-[#0A3B2E]/70 border border-[#126D4A] hover:border-[#7AC943]/60 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-2xl bg-[#126D4A] flex items-center justify-center text-[#7AC943] shadow-md group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Assistente de Saúde com IA</h3>
            <p className="text-xs text-[#CDEBC5] leading-relaxed">
              Tire dúvidas a qualquer momento sobre sua linha do tempo, medicamentos e evolução de exames com um assistente conectado ao seu contexto.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-8 rounded-3xl bg-[#0A3B2E]/70 border border-[#126D4A] hover:border-[#7AC943]/60 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-2xl bg-[#126D4A] flex items-center justify-center text-[#7AC943] shadow-md group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Gestão Familiar Integrada</h3>
            <p className="text-xs text-[#CDEBC5] leading-relaxed">
              Crie perfis independentes para seus filhos, pais ou cônjuge. Acompanhe a saúde de toda a família em um único aplicativo seguro.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-8 rounded-3xl bg-[#0A3B2E]/70 border border-[#126D4A] hover:border-[#7AC943]/60 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-2xl bg-[#126D4A] flex items-center justify-center text-[#7AC943] shadow-md group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Linha do Tempo Médica Vitalícia</h3>
            <p className="text-xs text-[#CDEBC5] leading-relaxed">
              Nunca mais perca datas de consultas passadas, vacinas aplicadas ou cirurgias realizadas. Sua história de saúde fica preservada para a vida toda.
            </p>
          </div>

          {/* Card 6 */}
          <div id="seguranca" className="p-8 rounded-3xl bg-[#0A3B2E]/70 border border-[#126D4A] hover:border-[#7AC943]/60 transition-all space-y-4 group">
            <div className="w-12 h-12 rounded-2xl bg-[#126D4A] flex items-center justify-center text-[#7AC943] shadow-md group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Privacidade Absoluta & LGPD</h3>
            <p className="text-xs text-[#CDEBC5] leading-relaxed">
              Seus dados pertencem exclusivamente a você. Criptografia no banco PostgreSQL com Row Level Security (RLS) e isolamento multi-tenant completo.
            </p>
          </div>

        </div>

      </section>

      {/* 7. Pricing Section (Individual & Família com 7 Dias Grátis) */}
      <section id="planos" className="py-24 bg-[#0A3B2E]/50 border-t border-[#126D4A]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#7AC943] uppercase tracking-widest block">
              PLANOS TRANSPARENTES COM 7 DIAS GRÁTIS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Escolha o plano ideal para você ou sua família
            </h2>
            <p className="text-xs sm:text-sm text-[#CDEBC5]">
              Comece com <strong>7 dias de teste gratuito</strong>. Sem taxa de cancelamento, cancele quando quiser.
            </p>

            {/* Monthly / Yearly Switcher */}
            <div className="pt-2 flex items-center justify-center">
              <div className="flex bg-[#061F18] p-1.5 rounded-2xl border border-[#126D4A] items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingInterval("monthly")}
                  className={`px-5 py-2 rounded-xl font-bold transition cursor-pointer ${
                    billingInterval === "monthly"
                      ? "bg-[#7AC943] text-[#0A3B2E] shadow-sm"
                      : "text-[#CDEBC5] hover:text-white"
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("yearly")}
                  className={`px-5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    billingInterval === "yearly"
                      ? "bg-[#7AC943] text-[#0A3B2E] shadow-sm font-black"
                      : "text-[#CDEBC5] hover:text-white"
                  }`}
                >
                  <span>Anual</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#126D4A] text-white text-[10px] font-extrabold">
                    20% OFF
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid (2 Colunas para Individual e Família) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            
            {HEALTH_PRICING_PLANS.map((plan: PricingPlan) => {
              const isPopular = plan.highlight;
              const price = billingInterval === "yearly" ? plan.priceYearlyMonthlyEquivalent : plan.priceMonthly;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-200 relative ${
                    isPopular
                      ? "bg-gradient-to-b from-[#0A3B2E] via-[#0A3B2E] to-[#126D4A]/50 border-2 border-[#7AC943] shadow-2xl scale-[1.02]"
                      : "bg-[#0A3B2E]/60 border border-[#126D4A] hover:border-[#7AC943]/50"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#7AC943] text-[#0A3B2E] font-black text-[11px] shadow-md uppercase tracking-wider whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                        {plan.subBadge && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#126D4A] text-[#CDEBC5]">
                            {plan.subBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#CDEBC5] mt-1.5 min-h-[32px] leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price Tag */}
                    <div className="pb-4 border-b border-[#126D4A]">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-[#CDEBC5]">R$</span>
                        <span className="text-4xl font-black text-white">{price}</span>
                        <span className="text-xs text-[#CDEBC5]">/mês</span>
                      </div>
                      {billingInterval === "yearly" && (
                        <span className="text-[11px] text-[#7AC943] font-bold block mt-1">
                          Faturado anualmente com 20% de desconto
                        </span>
                      )}
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#7AC943]/15 border border-[#7AC943]/30 text-[#7AC943] text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>7 dias de teste gratuito incluso</span>
                      </div>
                    </div>

                    {/* Quota highlights */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <Activity className="w-4 h-4 text-[#7AC943] shrink-0" />
                        <span>{plan.aiQuotaDescription}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#CDEBC5]">
                        <Lock className="w-4 h-4 text-[#7AC943] shrink-0" />
                        <span>{plan.storageDescription}</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 pt-2">
                      <span className="text-[11px] font-bold text-[#CDEBC5] uppercase tracking-wider block">
                        O que está incluso:
                      </span>
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-white">
                          <Check className="w-4 h-4 text-[#7AC943] shrink-0 mt-0.5" />
                          <span className="leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={onOpenBillingModal}
                      className={`w-full py-4 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                        isPopular
                          ? "bg-[#7AC943] hover:bg-[#96DC63] text-[#0A3B2E] shadow-lg shadow-[#7AC943]/20 hover:scale-[1.02]"
                          : "bg-[#126D4A] hover:bg-[#7AC943] text-white hover:text-[#0A3B2E]"
                      }`}
                    >
                      <span>Iniciar Teste Grátis de 7 Dias</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

          </div>

        </div>
      </section>

      {/* 8. FAQ Section */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold text-[#7AC943] uppercase tracking-widest block">
            PERGUNTAS FREQUENTES
          </span>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Tire suas dúvidas sobre o Vita4Me
          </h2>
          <p className="text-xs sm:text-sm text-[#CDEBC5]">
            Transparência absoluta sobre tecnologia, privacidade e ética médica.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-[#0A3B2E]/70 border border-[#126D4A] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white cursor-pointer hover:text-[#7AC943] transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#7AC943] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-[#CDEBC5] leading-relaxed border-t border-[#126D4A]/50 pt-3 animate-in fade-in duration-200 font-sans">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* 9. Final Call-to-Action */}
      <section className="py-24 bg-gradient-to-br from-[#0A3B2E] via-[#126D4A] to-[#0A3B2E] border-t border-[#7AC943]/30 relative overflow-hidden text-center">
        {/* Background Static V4M Brand Watermark Grande */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-[550px] pointer-events-none select-none z-0 flex items-center justify-center overflow-visible">
          <img
            src="/logo-icon-transparent.png"
            alt="Vita4Me V4M Logo Background"
            className="w-[700px] sm:w-[950px] md:w-[1200px] max-w-none opacity-[0.10] sm:opacity-[0.12] object-contain"
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Comece a organizar sua saúde com inteligência hoje.
          </h2>
          <p className="text-sm sm:text-base text-[#CDEBC5] max-w-xl mx-auto leading-relaxed">
            Experimente todos os recursos por 7 dias gratuitamente e faça a tradução do seu primeiro exame.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenBillingModal}
              className="px-10 py-4 rounded-2xl bg-[#7AC943] hover:bg-[#96DC63] text-[#0A3B2E] font-black text-sm shadow-2xl shadow-[#7AC943]/30 transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-2"
            >
              <span>Iniciar 7 Dias de Teste Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#CDEBC5]/70">
            Cancele a qualquer momento durante os 7 dias sem cobrança.
          </p>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-[#126D4A]/50 bg-[#061F18] py-12 text-xs text-[#CDEBC5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon-transparent.png"
              alt="Vita4Me Logo"
              className="h-8 w-auto object-contain"
            />
            <div>
              <span className="text-sm font-black text-white block">
                vita<span className="text-[#7AC943]">4</span>me
              </span>
              <span className="text-[10px] text-slate-400">
                &copy; 2026 Vita4Me Tecnologia em Saúde. Todos os direitos reservados.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[11px]">
            <button 
              onClick={() => setLegalModalTab("privacidade")} 
              className="hover:text-white transition cursor-pointer underline-offset-4 hover:underline"
            >
              Privacidade (LGPD)
            </button>
            <button 
              onClick={() => setLegalModalTab("termos")} 
              className="hover:text-white transition cursor-pointer underline-offset-4 hover:underline"
            >
              Termos de Uso
            </button>
            <button 
              onClick={() => setLegalModalTab("cookies")} 
              className="hover:text-white transition cursor-pointer underline-offset-4 hover:underline"
            >
              Cookies
            </button>
            <button 
              onClick={onOpenAuthModal} 
              className="hover:text-white font-semibold text-[#7AC943] transition cursor-pointer"
            >
              Acessar Prontuário &rarr;
            </button>
          </div>
        </div>
      </footer>

      {/* Global Legal Documents Modal */}
      {legalModalTab && (
        <LegalDocumentsModal
          isOpen={!!legalModalTab}
          onClose={() => setLegalModalTab(null)}
          initialTab={legalModalTab}
        />
      )}

    </div>
  );
};
