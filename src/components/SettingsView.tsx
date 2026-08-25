import React, { useState } from "react";
import { 
  Settings, 
  User, 
  Lock, 
  CreditCard, 
  ShieldCheck, 
  Database, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Heart,
  Crown,
  ClipboardList,
  Trash2
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { openStripeCustomerPortal } from "../lib/stripe";
import { LegalDocumentsModal, LegalTab } from "./LegalDocumentsModal";

interface SettingsViewProps {
  onOpenBillingModal: () => void;
  onOpenOnboarding?: () => void;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenBillingModal,
  onOpenOnboarding,
  onBack,
}) => {
  const { user, profile, isConfigured, updateUserPassword, signOut } = useAuth();

  // Password update form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  const handleDeleteAccount = async () => {
    if (!confirm('Atenção: Esta ação é irreversível. Todos os seus exames, documentos e histórico de saúde serão permanentemente excluídos conforme a LGPD. Deseja continuar?')) {
      return;
    }
    setIsDeletingAccount(true);
    try {
      if (isConfigured) {
        await supabase.rpc('delete_user_account');
      }
      await signOut();
      window.location.href = '/';
    } catch (err: any) {
      alert('Erro ao excluir conta: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await updateUserPassword(newPassword);
      if (error) {
        setPasswordMsg({ type: 'error', text: error });
      } else {
        setPasswordMsg({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Return Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
      >
        <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Voltar ao Dashboard</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Configurações & Prontuário</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Gerencie seus dados cadastrais, segurança da conta e assinatura do Vita4Me.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dados do Titular</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Nome Completo:</span>
              <strong className="text-slate-900 dark:text-white text-sm block">
                {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Titular'}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">E-mail Cadastrado:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">{user?.email || '—'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Tipo Sanguíneo</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">{profile?.blood_type || 'Não informado'}</strong>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Recursos de IA</span>
                <strong className="text-emerald-700 dark:text-emerald-400 text-xs font-bold block">Incluído no Plano</strong>
              </div>
            </div>

            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
              >
                <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Atualizar Questionário de Anamnese (Peso, Altura, Hábitos, Remédios)</span>
              </button>
            )}
          </div>
        </div>

        {/* Stripe Subscription Plan Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assinatura & Plano</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Plano {profile?.plan_tier === 'family' ? 'FAMÍLIA' : 'INDIVIDUAL'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Você possui acesso com histórico contínuo e traduções de exames inteligentes com a tecnologia Gemini IA.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={onOpenBillingModal}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Fazer Upgrade / Alterar Plano
            </button>

            <button
              onClick={() => openStripeCustomerPortal()}
              className="w-full py-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Gerenciar Faturamento no Portal Stripe
            </button>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alterar Senha de Acesso</h3>
          </div>

          {passwordMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nova Senha</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Atualizar Senha</span>}
            </button>
          </form>
        </div>

        {/* Database & Security Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Database className="w-5 h-5 text-emerald-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Infraestrutura & Privacidade</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <span>Supabase PostgreSQL:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isConfigured ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                {isConfigured ? 'CONECTADO COM RLS' : 'NÃO CONECTADO'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <strong className="text-emerald-700 dark:text-emerald-400 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Isolamento Absoluto (RLS Multi-Tenant)
              </strong>
              Seus dados de saúde são criptografados ponta a ponta e 100% segregados por usuário. Nenhum outro paciente ou terceiro tem acesso aos seus exames.
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLegalModalTab("privacidade")}
                className="flex-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold transition cursor-pointer"
              >
                Política de Privacidade
              </button>
              <button
                type="button"
                onClick={() => setLegalModalTab("termos")}
                className="flex-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold transition cursor-pointer"
              >
                Termos de Uso
              </button>
              <button
                type="button"
                onClick={() => setLegalModalTab("cookies")}
                className="flex-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold transition cursor-pointer"
              >
                Cookies
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="w-full py-2 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir Minha Conta & Apagar Todos os Dados (LGPD)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Ethical & Clinical Boundaries Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Diretrizes de Segurança, Privacidade & Limites Clínicos da IA
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Compromisso rigoroso com a ética médica, sigilo de dados e conformidade legal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <strong className="text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5">
              ⚠️ Limites Clínicos & Vedação de Prática Médica
            </strong>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              O Vita4Me é uma tecnologia de <strong>letramento e organização pessoal em saúde</strong>. A inteligência artificial <u>não é um médico, não realiza diagnósticos, não prescreve tratamentos e não substitui consultas presenciais</u>. Todas as decisões terapêuticas devem ser tomadas exclusivamente por profissionais de saúde habilitados.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              🔒 Propriedade de Dados & Conformidade LGPD
            </strong>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              O paciente é o <strong>único proprietário dos seus dados médicos</strong>. Os exames e laudos são protegidos por Row Level Security (RLS) no PostgreSQL, com criptografia em trânsito e em repouso. Seus dados nunca são vendidos ou compartilhados com planos de saúde ou anunciantes.
            </p>
          </div>
        </div>
      </div>

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
