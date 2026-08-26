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
  Sparkles,
  RefreshCw,
  CreditCard
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
      content: `Olá! Sou o Assistente Clínico Inteligente do Vita4Me. Tenho acesso seguro ao prontuário de ${activeMember?.name || 'você'} para ajudar a entender seus laudos, esclarecer termos médicos, comparar biomarcadores e resumir seu histórico de saúde. Como posso ajudar você hoje?`,
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
        
        if (res.status === 402 || res.status === 403 || errorData.code === "PAYMENT_REQUIRED" || errorData.code === "TRIAL_EXPIRED") {
          setBillingRequired(true);
          const trialMsg: HealthAIChatMessage = {
            id: "ai-pay-" + Date.now(),
            sender: "assistant",
            content: errorData.error || "O Assistente com IA está disponível durante os 7 dias de teste grátis ou nos planos ativos do Vita4Me. Assine ou reative seu plano para continuar.",
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, trialMsg]);
        } else if (res.status === 429) {
          const rateMsg: HealthAIChatMessage = {
            id: "ai-rate-" + Date.now(),
            sender: "assistant",
            content: "Você atingiu o limite temporário de mensagens por minuto. Por favor, aguarde alguns instantes antes de enviar uma nova pergunta.",
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, rateMsg]);
        } else {
          throw new Error(errorData.error || "Erro na resposta do servidor");
        }
      }
    } catch (err: any) {
      setLastFailedMessage(text.trim());
      const errorMsg: HealthAIChatMessage = {
        id: "ai-err-" + Date.now(),
        sender: "assistant",
        content: "Não foi possível consultar seu prontuário no momento devido a uma instabilidade passageira de rede. Clique no botão de tentar novamente.",
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
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
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200 h-[calc(100vh-6.5rem)] min-h-[620px] flex flex-col">
      {/* Return Button & Header */}
      <div className="shrink-0 space-y-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Voltar ao Dashboard</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Bot className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Assistente Clínico com IA</span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Consultas em tempo real sobre laudos, medicamentos e biomarcadores de {activeMember?.name || 'você'}.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold font-mono self-start sm:self-auto shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Prontuário Conectado
          </span>
        </div>

        {/* Clinical Safety & Legal Disclaimer Banner */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold shrink-0 text-[10px]">⚠️ AVISO</span>
            <span>
              <strong>Letramento Médico:</strong> O assistente organiza seu histórico e esclarece dúvidas. 
              <u>Não faz diagnósticos, prescrições nem substitui consultas médicas.</u>
            </span>
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono hidden md:inline shrink-0">
            CFM &bull; LGPD
          </span>
        </div>
      </div>

      {/* Chat Messages Window - Maximized Vertical Area */}
      <div className="flex-1 min-h-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-4 shadow-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.sender === "user"
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white"
                  : "bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-1 shadow-xs"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed space-y-1.5 ${
                msg.sender === "user"
                  ? "bg-emerald-600 text-white rounded-tr-xs shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <span className={`block text-[10px] text-right font-mono ${
                msg.sender === "user" ? "text-emerald-100" : "text-slate-400"
              }`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/20 p-1 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>Consultando seu prontuário e analisando informações com IA...</span>
            </div>
          </div>
        )}

        {/* Retry Button if last message failed */}
        {lastFailedMessage && !isLoading && (
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => handleSendMessage(lastFailedMessage)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* Upgrade / Billing CTA if subscription is required */}
        {billingRequired && onOpenBillingModal && (
          <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 text-center sm:text-left">
              <strong className="text-emerald-900 dark:text-emerald-200 font-bold block">Desbloqueie o Assistente Clínico Ilimitado</strong>
              <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">Tenha acesso total a laudos, comparativos e inteligência médica contínua.</p>
            </div>
            <button
              onClick={onOpenBillingModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Ver Planos & 7 Dias Grátis</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions - Wrap naturally without horizontal scrollbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        {quickPrompts.map((promptText) => (
          <button
            key={promptText}
            onClick={() => handleSendMessage(promptText)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{promptText}</span>
          </button>
        ))}
      </div>

      {/* Input Bar - Fixed visually at the bottom */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="shrink-0 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Pergunte sobre seus exames, medicamentos, sintomas ou histórico..."
          disabled={isLoading}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
          title="Enviar mensagem"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
