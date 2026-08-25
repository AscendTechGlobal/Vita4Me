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
  Trash2, 
  Activity, 
  Scale, 
  Phone, 
  Flame, 
  AlertTriangle,
  Edit3
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

type SettingsTab = "health" | "account" | "security" | "billing";

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenBillingModal,
  onOpenOnboarding,
  onBack,
}) => {
  const { user, profile, isConfigured, updateUserPassword, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("health");

  // Password update form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  // Cálculo automático de IMC
  const heightM = (profile?.height_cm || 0) / 100;
  const weightKg = profile?.weight_kg || 0;
  const imcNum = (heightM > 0 && weightKg > 0) ? (weightKg / (heightM * heightM)) : null;
  const imcStr = imcNum ? imcNum.toFixed(1) : "—";

  const getImcClassification = (val: number | null) => {
    if (!val) return null;
    if (val < 18.5) return { label: "Abaixo do peso", color: "text-amber-500" };
    if (val < 24.9) return { label: "Peso adequado", color: "text-emerald-500" };
    if (val < 29.9) return { label: "Sobrepeso", color: "text-amber-500" };
    return { label: "Obesidade", color: "text-rose-500" };
  };

  const imcClass = getImcClassification(imcNum);

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
            Consulte e gerencie seu perfil de saúde, segurança da conta e assinatura do Vita4Me.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("health")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === "health"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Meu Perfil de Saúde</span>
        </button>

        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === "account"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Conta & Titular</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === "security"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Segurança & Acesso</span>
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === "billing"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>Plano & Assinatura</span>
        </button>
      </div>

      {/* TAB 1: MEU PERFIL DE SAÚDE */}
      {activeTab === "health" && (
        <div className="space-y-6">
          {/* Top Bar with Edit Button */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Meu Perfil de Saúde & Anamnese</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dados clínicos estruturados e sincronizados com segurança no seu prontuário.
              </p>
            </div>

            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Perfil de Saúde</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bloco 1: Dados Pessoais */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Dados Pessoais</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Nome</span>
                  <strong className="text-slate-900 dark:text-white font-medium block truncate">
                    {profile?.full_name || user?.user_metadata?.full_name || 'Não informado'}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Data de Nascimento</span>
                  <strong className="text-slate-900 dark:text-white font-medium block">
                    {profile?.date_of_birth ? new Date(profile.date_of_birth + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Sexo Biológico</span>
                  <strong className="text-slate-900 dark:text-white font-medium block">
                    {profile?.gender || 'Não informado'}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Tipo Sanguíneo</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold block text-sm">
                    {profile?.blood_type || 'Não informado'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bloco 2: Medidas Corporais & IMC */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Medidas Corporais & Biometria</h3>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Altura</span>
                  <strong className="text-slate-900 dark:text-white font-mono text-base block mt-0.5">
                    {profile?.height_cm ? `${profile.height_cm} cm` : '—'}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Peso Atual</span>
                  <strong className="text-slate-900 dark:text-white font-mono text-base block mt-0.5">
                    {profile?.weight_kg ? `${profile.weight_kg} kg` : '—'}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">IMC Calculado</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-base block mt-0.5">
                    {imcStr}
                  </strong>
                  {imcClass && (
                    <span className={`text-[9px] font-bold block ${imcClass.color}`}>{imcClass.label}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 3: Hábitos e Estilo de Vida */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Hábitos & Estilo de Vida</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Tabagismo:</span>
                  <strong className="text-slate-900 dark:text-white font-medium">{profile?.smoking_status || 'Não informado'}</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Consumo de Álcool:</span>
                  <strong className="text-slate-900 dark:text-white font-medium">{profile?.alcohol_status || 'Não informado'}</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Atividade Física:</span>
                  <strong className="text-slate-900 dark:text-white font-medium">{profile?.activity_level || 'Não informado'}</strong>
                </div>
              </div>
            </div>

            {/* Bloco 4: Histórico de Saúde & Alergias */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Alergias & Condições Crônicas</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Alergias Relatadas</span>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {profile?.allergies && profile.allergies.length > 0
                      ? profile.allergies.join(", ")
                      : "Nenhuma alergia relatada"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Condições Crônicas / Antecedentes</span>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {profile?.chronic_conditions && profile.chronic_conditions.length > 0
                      ? profile.chronic_conditions.join(", ")
                      : "Nenhuma condição crônica declarada"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 5: Contato de Emergência */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Contato de Emergência</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Nome do Contato</span>
                  <strong className="text-slate-900 dark:text-white font-medium text-sm block mt-0.5">
                    {profile?.emergency_contact_name || 'Não cadastrado'}
                  </strong>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Telefone / WhatsApp</span>
                  <strong className="text-slate-900 dark:text-white font-mono text-sm block mt-0.5">
                    {profile?.emergency_contact_phone || 'Não cadastrado'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTA & TITULAR */}
      {activeTab === "account" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dados da Conta</h3>
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
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Database className="w-5 h-5 text-emerald-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Privacidade & LGPD</h3>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Você tem o direito de solicitar a exclusão total da sua conta e de todos os dados clínicos armazenados conforme o Art. 18 da LGPD.
              </p>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="w-full py-2.5 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir Minha Conta Permanentemente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEGURANÇA & ACESSO */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Password Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alterar Senha</h3>
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

          {/* Infrastructure & Legal Terms */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Conformidade & Documentos</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <strong className="text-emerald-700 dark:text-emerald-400 block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Row Level Security Ativo
                </strong>
                Seus dados são 100% segregados por credenciais criptográficas. Nenhum terceiro tem acesso aos seus exames.
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLegalModalTab("privacidade")}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-semibold transition cursor-pointer text-left"
                >
                  📄 Política de Privacidade
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModalTab("termos")}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-semibold transition cursor-pointer text-left"
                >
                  📜 Termos de Uso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLANO & ASSINATURA */}
      {activeTab === "billing" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Crown className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assinatura do Vita4Me</h3>
                <p className="text-xs text-slate-500">Histórico contínuo e inteligência clínica Gemini.</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Plano {profile?.plan_tier === 'family' ? 'FAMÍLIA' : 'INDIVIDUAL'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <span className="text-slate-500 font-semibold block">Status da Assinatura:</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`} />
              <strong className="text-slate-900 dark:text-white uppercase font-mono">
                {profile?.subscription_status || 'Inativo'}
              </strong>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={onOpenBillingModal}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Fazer Upgrade / Alterar Plano
            </button>

            <button
              onClick={() => openStripeCustomerPortal()}
              className="w-full py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Gerenciar Faturamento no Portal Stripe
            </button>
          </div>
        </div>
      )}

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
