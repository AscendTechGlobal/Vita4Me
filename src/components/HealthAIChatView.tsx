import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  MessageSquare, 
  AlertCircle, 
  RefreshCw, 
  CreditCard,
  Lock
} from "lucide-react";
import { HealthAIChatMessage, LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember } from "../types";
import { getAuthHeaders } from "../lib/apiClient";
import { trackAiUsage } from "../lib/analytics";

interface HealthAIChatViewProps {
  activeMember: FamilyMember | null;
  exams: LabExam[];
  indicators: HealthIndicator[];
  medications: Medication[];
  records: HealthRecord[];
  onOpenBillingModal?: () => void;
  onBack: () => void;
}

/**
 * Renderizador de formatação médica didática (converte markdown simples, bullets e negrito em JSX refinado)
 */
const renderFormattedMessage = (content: string) => {
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-[13px] sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Detecção de lista com marcador (* ou -)
        const isBullet = /^[*-]\s+/.test(trimmed);
        const bulletText = isBullet ? trimmed.replace(/^[*-]\s+/, "") : trimmed;

        // Detecção de lista numerada (ex: 1. ou 2.)
        const isNumbered = /^\d+\.\s+/.test(trimmed);
        const numberPrefix = isNumbered ? trimmed.match(/^(\d+\.)\s+/)?.[1] : "";
        const cleanText = isNumbered ? trimmed.replace(/^\d+\.\s+/, "") : bulletText;

        // Processa negrito inline (**texto**)
        const parts = cleanText.split(/(\*\*[^*]+\*\*)/g);
        const formattedLine = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#1DB954] mt-2 shrink-0" />
              <div className="flex-1 text-slate-700 dark:text-[#E0E0E0]">
                {formattedLine}
              </div>
            </div>
          );
        }

        if (isNumbered) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-[#1DB954] shrink-0 mt-0.5">
                {numberPrefix}
              </span>
              <div className="flex-1 text-slate-700 dark:text-[#E0E0E0]">
                {formattedLine}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-slate-700 dark:text-[#E0E0E0]">
            {formattedLine}
          </p>
        );
      })}
    </div>
  );
};

export const HealthAIChatView: React.FC<HealthAIChatViewProps> = ({
  activeMember,
  exams,
  indicators,
  medications,
  records,
  onOpenBillingModal,
  onBack,
}) => {
  const [messages, setMessages] = useState<HealthAIChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      content: `Olá! Sou o Assistente Clínico Inteligente do Vita4Me. Tenho acesso seguro ao prontuário de ${activeMember?.name || 'você'} para ajudar a entender seus laudos, esclarecer termos médicos, comparar biomarcadores e resumir seu histórico de saúde.\n\nComo posso ajudar você hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [billingRequired, setBillingRequired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: HealthAIChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);
    setLastFailedMessage(null);
    setBillingRequired(false);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text.trim(),
          familyMemberId: activeMember?.id || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: HealthAIChatMessage = {
          id: "ai-" + Date.now(),
          sender: "assistant",
          content: data.reply || "Não consegui gerar uma resposta detalhada no momento. Poderia reformular?",
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        trackAiUsage('chat_assistant');
      } else {
        const errorData = await res.json().catch(() => ({}));
        
        if (res.status === 401) {
          const authMsg: HealthAIChatMessage = {
            id: "ai-auth-" + Date.now(),
            sender: "assistant",
            content: "Sua sessão de autenticação expirou. Faça login novamente para continuar a usar o assistente.",
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, authMsg]);
        } else if (res.status === 402 || res.status === 403 || errorData.code === "PAYMENT_REQUIRED" || errorData.code === "TRIAL_EXPIRED") {
          setBillingRequired(true);
          const trialMsg: HealthAIChatMessage = {
            id: "ai-pay-" + Date.now(),
            sender: "assistant",
            content: errorData.message || errorData.error || "O Assistente com IA está disponível durante os 7 dias de teste grátis ou nos planos ativos do Vita4Me. Assine ou reative seu plano para continuar.",
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, trialMsg]);
        } else if (res.status === 429) {
          const rateMsg: HealthAIChatMessage = {
            id: "ai-rate-" + Date.now(),
            sender: "assistant",
            content: "Você atingiu o limite temporário de consultas por minuto. Por favor, aguarde alguns instantes antes de enviar uma nova pergunta.",
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, rateMsg]);
        } else {
          setLastFailedMessage(text.trim());
          const codePrefix = errorData.code ? `[${errorData.code}] ` : "";
          const refSuffix = errorData.requestId ? ` (Ref: ${errorData.requestId.slice(0, 8)})` : "";
          const errorMsg: HealthAIChatMessage = {
            id: "ai-err-" + Date.now(),
            sender: "assistant",
            content: `${codePrefix}${errorData.message || errorData.error || "Houve uma instabilidade temporária ao consultar o prontuário."}${refSuffix}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      }
    } catch (err: any) {
      setLastFailedMessage(text.trim());
      const netErrorMsg: HealthAIChatMessage = {
        id: "ai-net-" + Date.now(),
        sender: "assistant",
        content: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, netErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Resuma meus últimos exames laboratoriais",
    "Como está o meu nível de colesterol?",
    "Quais remédios contínuos estou tomando?",
    "Identifique alguma alteração nos meus indicadores recentes",
  ];

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-5xl mx-auto space-y-3 sm:space-y-4 animate-in fade-in duration-200 h-[calc(100vh-6.5rem)] min-h-[640px] flex flex-col">
      {/* Return Button & Header */}
      <div className="shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#252525] text-slate-700 dark:text-[#b3b3b3] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#282828] text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
            <span>Voltar ao Prontuário</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-[#1DB954] rounded-full text-xs font-medium font-mono shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Prontuário Ativo &bull; {activeMember?.name || 'Titular'}</span>
          </span>
        </div>

        {/* Clinical Safety & Disclaimer Capsule */}
        <div className="px-3.5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[9px] uppercase tracking-wider shrink-0">
              Aviso Clínico
            </span>
            <span className="leading-snug">
              O assistente organiza dados do seu prontuário e esclarece dúvidas. 
              <span className="font-semibold underline ml-1">Não substitui consultas médicas nem fornece diagnósticos.</span>
            </span>
          </div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono hidden md:inline shrink-0">
            CFM &bull; LGPD
          </span>
        </div>
      </div>

      {/* Chat Messages Window - Maximized Vertical Area */}
      <div className="flex-1 min-h-[360px] bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222222] rounded-3xl p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-5 shadow-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 sm:gap-3.5 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar Icon */}
            {msg.sender === "user" ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#282828] text-slate-700 dark:text-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-slate-300 dark:ring-[#333]">
                <User className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] p-1 flex items-center justify-center shrink-0 shadow-2xs">
                <img
                  src="/logo-icon-transparent.png"
                  alt="Vita4Me"
                  className="w-5 h-5 object-contain"
                />
              </div>
            )}

            {/* Message Bubble */}
            {msg.sender === "user" ? (
              <div className="max-w-[85%] sm:max-w-[75%] bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-[#1DB954] dark:to-[#179a45] text-white dark:text-black font-medium rounded-2xl rounded-tr-xs px-4 py-3 shadow-sm shadow-emerald-500/10 dark:shadow-[#1DB954]/10">
                <div className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
                  {msg.content}
                </div>
                <span className="block text-[10px] text-right font-mono mt-1 text-emerald-100 dark:text-black/70">
                  {msg.timestamp}
                </span>
              </div>
            ) : (
              <div className="flex-1 max-w-[90%] sm:max-w-[85%] bg-slate-50/70 dark:bg-[#181818] border border-slate-200/80 dark:border-[#282828] text-slate-800 dark:text-[#E0E0E0] rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-2xs transition-all">
                {/* Header in Assistant Bubble */}
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/60 dark:border-[#242424]">
                  <span className="text-[11px] font-bold tracking-tight text-slate-800 dark:text-[#1DB954]">
                    Assistente Clínico Vita4Me
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-[#777]">
                    {msg.timestamp}
                  </span>
                </div>

                {renderFormattedMessage(msg.content)}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] p-1 flex items-center justify-center shrink-0 shadow-2xs">
              <img
                src="/logo-icon-transparent.png"
                alt="Vita4Me"
                className="w-5 h-5 object-contain animate-pulse"
              />
            </div>
            <div className="bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#282828] rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2.5 shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-[#1DB954]" />
              <span>Consultando seu prontuário e analisando informações...</span>
            </div>
          </div>
        )}

        {/* Retry Button if last message failed */}
        {lastFailedMessage && !isLoading && (
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => handleSendMessage(lastFailedMessage)}
              className="px-4 py-2 bg-slate-100 dark:bg-[#222] hover:bg-slate-200 dark:hover:bg-[#2c2c2c] text-slate-700 dark:text-[#b3b3b3] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* Upgrade / Billing CTA if subscription is required */}
        {billingRequired && onOpenBillingModal && (
          <div className="p-4 bg-emerald-50/80 dark:bg-[#16221b] border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
            <div className="space-y-0.5 text-center sm:text-left">
              <strong className="text-emerald-900 dark:text-emerald-200 font-bold block text-sm">
                Desbloqueie o Assistente Clínico Ilimitado
              </strong>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs">
                Tenha acesso total a laudos, comparativos e inteligência médica contínua.
              </p>
            </div>
            <button
              onClick={onOpenBillingModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              <span>Ver Planos & 7 Dias Grátis</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-[#888]">
          <span>Sugestões para perguntar:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickPrompts.map((promptText) => (
            <button
              key={promptText}
              onClick={() => handleSendMessage(promptText)}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] border border-slate-200 dark:border-[#282828] hover:border-emerald-500/50 dark:hover:border-[#1DB954]/50 text-slate-700 dark:text-[#B3B3B3] hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 active:scale-[0.98]"
            >
              <span>{promptText}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar - Unified Capsule with Shortcuts & Privacy notice */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="shrink-0 space-y-1.5"
      >
        <div className="relative flex items-center bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] focus-within:border-emerald-500 dark:focus-within:border-[#1DB954] focus-within:ring-2 focus-within:ring-emerald-500/20 dark:focus-within:ring-[#1DB954]/20 rounded-2xl p-1.5 sm:p-2 shadow-sm transition-all">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pergunte sobre seus exames, medicamentos, sintomas ou histórico..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-0 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-[#727272] focus:outline-none disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold rounded-xl flex items-center justify-center shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="Enviar mensagem (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 dark:text-[#727272]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
            <span>Privacidade e criptografia médica ponta a ponta</span>
          </span>
          <span className="hidden sm:inline font-mono">Pressione Enter ↵ para enviar</span>
        </div>
      </form>
    </div>
  );
};
