import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  ArrowLeft, 
  Loader2, 
  Heart, 
  ShieldCheck,
  Calendar,
  Activity,
  FileText,
  MessageSquare
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
  onBack: () => void;
}

export const HealthAIChatView: React.FC<HealthAIChatViewProps> = ({
  activeMember,
  exams,
  indicators,
  medications,
  records,
  onBack,
}) => {
  const [messages, setMessages] = useState<HealthAIChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      content: `Olá! Sou o Assistente Inteligente do Vita4Me. Tenho acesso ao prontuário de ${activeMember?.name || 'você'} para ajudar você a entender seus exames, tirar dúvidas sobre termos médicos e resumir sua linha do tempo de saúde. Como posso ajudar hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

    try {
      const patientContext = {
        name: activeMember?.name || "Paciente",
        bloodType: activeMember?.blood_type || "O+",
        allergies: activeMember?.allergies || [],
        medications: medications.map(m => `${m.name} (${m.dosage} - ${m.frequency})`),
        recentExams: exams.slice(0, 3).map(e => `${e.title} em ${e.exam_date}: ${e.ai_summary}`),
        indicators: indicators.slice(0, 5).map(i => `${i.name}: ${i.value} ${i.unit}`),
      };

      const headers = await getAuthHeaders();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text.trim(),
          patientContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: HealthAIChatMessage = {
          id: "ai-" + Date.now(),
          sender: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        trackAiUsage('chat_assistant');
      } else {
        throw new Error("Erro na resposta da IA");
      }
    } catch (err) {
      const errorMsg: HealthAIChatMessage = {
        id: "ai-err-" + Date.now(),
        sender: "assistant",
        content: "Desculpe, tive uma instabilidade temporária ao consultar seu prontuário. Por favor, tente novamente.",
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200 h-[calc(100vh-6rem)] flex flex-col">
      {/* Return Button & Header */}
      <div className="shrink-0 space-y-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Voltar ao Dashboard</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Bot className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Assistente Clínico Conversacional</span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Tire dúvidas sobre seus exames, medicamentos e histórico de {activeMember?.name || 'você'}.
            </p>
          </div>

          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            Contexto Médico Conectado
          </span>
        </div>

        {/* Clinical Safety & Legal Disclaimer Banner */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold shrink-0">⚠️ AVISO</span>
            <span>
              <strong>Limites Clínicos da IA:</strong> Este assistente atua exclusivamente no letramento e organização do histórico de saúde. 
              A IA <u>não realiza diagnósticos, prescrições ou substitui a consulta com seu médico</u>.
            </span>
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono hidden md:inline shrink-0">
            Conformidade CFM &bull; LGPD
          </span>
        </div>
      </div>

      {/* Chat Messages Window */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-4 shadow-xs">
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
                  : "bg-white dark:bg-slate-800 border border-emerald-500/20 p-1 shadow-xs"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <img
                  src="/logo-icon-transparent.png"
                  alt="Vita4Me AI"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-1 ${
                msg.sender === "user"
                  ? "bg-emerald-600 text-white rounded-tr-xs shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs"
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
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-emerald-500/20 p-1 flex items-center justify-center">
              <img
                src="/logo-icon-transparent.png"
                alt="Vita4Me AI"
                className="w-full h-full object-contain animate-pulse"
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>Consultando seu histórico médico com IA...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto pb-1">
        {[
          "Resuma meus últimos exames laboratoriais",
          "Como está o meu nível de colesterol?",
          "Quais remédios contínuos estou tomando?",
          "Quando fiz meu último checkup médico?",
        ].map((promptText) => (
          <button
            key={promptText}
            onClick={() => handleSendMessage(promptText)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{promptText}</span>
          </button>
        ))}
      </div>

      {/* Input Bar */}
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
          placeholder="Pergunte sobre seus exames, medicamentos, sintomas ou taxas..."
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
        />

        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
