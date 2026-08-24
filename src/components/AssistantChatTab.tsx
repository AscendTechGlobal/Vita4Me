import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  ShieldCheck, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { ChatMessage, UserProfile, Exam, MedicalRecord, Medication, Vaccine, DailyHabits } from '../types';
import { getAuthHeaders } from '../lib/apiClient';

interface AssistantChatTabProps {
  userProfile: UserProfile;
  exams: Exam[];
  medicalRecords: MedicalRecord[];
  medications: Medication[];
  vaccines: Vaccine[];
  dailyHabits: DailyHabits;
}

export const AssistantChatTab: React.FC<AssistantChatTabProps> = ({
  userProfile,
  exams,
  medicalRecords,
  medications,
  vaccines,
  dailyHabits
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'assistant',
      text: `Olá, ${userProfile.name.split(' ')[0]}! Sou o **Assistente Inteligente Vita4Me**.\n\nTenho acesso direto e seguro a todo o seu histórico de saúde cadastrado (${exams.length} exames, receitas, consultas e vacinas).\n\nComo posso ajudar você hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        "Quando fiz meu último exame de sangue?",
        "Mostre meus exames de colesterol",
        "Como evoluiu minha glicemia?",
        "Tenho alguma vacina pendente?",
        "Quais medicamentos utilizo hoje?"
      ]
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: prompt,
          history: messages.slice(-6), // Send last few messages for context
          contextData: {
            userProfile,
            exams,
            medicalRecords,
            medications,
            vaccines,
            dailyHabits
          }
        })
      });

      const data = await response.json();

      if (data.success && data.text) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: data.text,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: data.suggestedActions
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || "Erro na resposta da IA.");
      }
    } catch (err: any) {
      console.error("Erro ao enviar mensagem:", err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: "Desculpe, ocorreu uma instabilidade ao consultar o assistente da Vita4Me. Por favor, tente novamente.",
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-emerald-500/20 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img
              src="/logo-icon-transparent.png"
              alt="Vita4Me AI"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Assistente IA Vita4Me
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Gemini 3.6
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Conectado ao seu histórico de saúde pessoal • Criptografia ativa
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages(messages.slice(0, 1))}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
          title="Reiniciar conversa"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Limpar Chat</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              msg.sender === 'user' 
                ? 'bg-emerald-500 text-slate-950 font-bold text-xs' 
                : 'bg-white dark:bg-slate-800 p-1 border border-emerald-500/20'
            }`}>
              {msg.sender === 'user' ? (
                'EW'
              ) : (
                <img
                  src="/logo-icon-transparent.png"
                  alt="Vita4Me AI"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Content Box */}
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap font-sans">
                {msg.text}
              </div>

              {/* Suggested Action Pills */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                  {msg.suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(action)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-teal-300 border border-teal-500/30 text-[11px] font-medium transition-colors"
                    >
                      💡 {action}
                    </button>
                  ))}
                </div>
              )}

              <span className={`block text-[10px] mt-2 text-right ${
                msg.sender === 'user' ? 'text-slate-900/70 font-semibold' : 'text-slate-500'
              }`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-teal-400 border border-slate-700 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>Analisando seu histórico e formulando resposta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Pergunte qualquer coisa sobre seu histórico de saúde (ex: Quando fiz meu último exame?)..."
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isTyping}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center mt-2">
          A Vita4Me não realiza diagnósticos e não substitui o atendimento de médicos.
        </p>
      </div>

    </div>
  );
};
