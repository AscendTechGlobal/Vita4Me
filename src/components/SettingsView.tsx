import React, { useState, useEffect } from "react";
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
  Edit3,
  Camera,
  Upload,
  Mail,
  Save,
  X,
  Palette,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";
import { openStripeCustomerPortal } from "../lib/stripe";
import { cancelUnifiedSubscription } from "../lib/billing";
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
  const { user, profile, isConfigured, updateUserPassword, signOut, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("health");

  // Basic profile edit form
  const [editFullName, setEditFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || ""
  );
  const [editPhone, setEditPhone] = useState(
    profile?.phone || profile?.emergency_contact_phone || user?.user_metadata?.phone || ""
  );
  const [editAvatarUrl, setEditAvatarUrl] = useState(
    profile?.avatar_url || user?.user_metadata?.avatar_url || ""
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Email update form
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password update form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  // Sync state when profile or user changes
  useEffect(() => {
    if (profile?.full_name || user?.user_metadata?.full_name) {
      setEditFullName(profile?.full_name || user?.user_metadata?.full_name || "");
    }
    if (profile?.phone || profile?.emergency_contact_phone || user?.user_metadata?.phone) {
      setEditPhone(profile?.phone || profile?.emergency_contact_phone || user?.user_metadata?.phone || "");
    }
    if (profile?.avatar_url || user?.user_metadata?.avatar_url) {
      setEditAvatarUrl(profile?.avatar_url || user?.user_metadata?.avatar_url || "");
    }
    if (user?.email) {
      setEditEmail(user.email);
    }
  }, [profile, user]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setProfileMsg({ type: "error", text: "A foto selecionada deve ter no máximo 3MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          setEditAvatarUrl(compressed);
          setProfileMsg(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      // 1. Atualizar user_metadata no Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: editFullName.trim(),
          avatar_url: editAvatarUrl,
          phone: editPhone.trim(),
        },
      });

      if (authErr) throw authErr;

      // 2. Atualizar tabela profiles
      if (user?.id) {
        const updatePayload: any = {
          full_name: editFullName.trim(),
          avatar_url: editAvatarUrl || null,
          phone: editPhone.trim() || null,
          emergency_contact_phone: editPhone.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error: profileErr } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", user.id);

        if (profileErr) {
          console.warn("Aviso ao sincronizar profiles:", profileErr.message);
          // Fallback caso as colunas avatar_url ou phone ainda não tenham sido criadas em profiles
          if (profileErr.message?.includes("avatar_url") || profileErr.message?.includes("phone")) {
            await supabase
              .from("profiles")
              .update({
                full_name: editFullName.trim(),
                emergency_contact_phone: editPhone.trim(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);
          }
        }
      }

      if (refreshProfile) {
        await refreshProfile();
      }

      setProfileMsg({ type: "success", text: "Dados básicos atualizados com sucesso!" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Falha ao salvar dados do perfil." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = editEmail.trim().toLowerCase();
    if (!cleanEmail || cleanEmail === user?.email?.toLowerCase()) {
      setEmailMsg({ type: "error", text: "Informe um endereço de e-mail diferente do atual." });
      return;
    }
    setIsUpdatingEmail(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({
        email: cleanEmail,
      });

      if (error) throw error;

      setEmailMsg({
        type: "success",
        text: `Solicitação registrada! Um link de confirmação foi enviado para ${cleanEmail}. Por segurança, confirme o link na sua caixa de entrada para efetivar a alteração.`,
      });
    } catch (err: any) {
      setEmailMsg({ type: "error", text: err.message || "Não foi possível atualizar o e-mail." });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirm = window.confirm(
      "Deseja realmente cancelar sua assinatura? O acesso aos recursos com IA continuará até o término do ciclo já contratado."
    );
    if (!confirm) return;

    setIsCanceling(true);
    setCancelMessage(null);
    try {
      await cancelUnifiedSubscription();
      if (refreshProfile) await refreshProfile();
      setCancelMessage("Assinatura cancelada com sucesso.");
    } catch (err: any) {
      alert(err.message || "Não foi possível cancelar a assinatura. Tente novamente.");
    } finally {
      setIsCanceling(false);
    }
  };

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
        <div className="space-y-6">
          {/* Card Principal: Dados Básicos e Foto de Perfil */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dados do Titular</h3>
                  <p className="text-[11px] text-slate-500">Atualize sua foto, nome completo e telefone de contato</p>
                </div>
              </div>
            </div>

            {profileMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 transition-all ${
                  profileMsg.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                }`}
              >
                {profileMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Seção da Foto de Perfil */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center font-bold text-xl overflow-hidden shadow-md border-2 border-emerald-500/30">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {editFullName?.charAt(0)?.toUpperCase() ||
                          user?.email?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </span>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 rounded-full bg-slate-950/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Alterar foto"
                  >
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-semibold">Trocar</span>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                </div>

                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Foto de Perfil</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Envie uma imagem do seu dispositivo (JPG, PNG ou WebP até 3MB).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label
                      htmlFor="avatar-upload"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Fazer Upload</span>
                    </label>

                    {editAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl("")}
                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-medium cursor-pointer transition flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid de Inputs: Nome e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dra. Mariana Silva"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={editPhone}
                      onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Perfil */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-60"
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar Dados do Perfil</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card: Aparência & Tema */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aparência & Tema</h3>
                  <p className="text-[11px] text-slate-500">Escolha a experiência visual de sua preferência no Vita4Me</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opção Modo Claro Tradicional */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                  theme === "light"
                    ? "bg-slate-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  {theme === "light" && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      Ativo
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Modo Claro (Tradicional)</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Visual clássico e limpo, cartões brancos com alta legibilidade e detalhes suaves.
                  </p>
                </div>
              </button>

              {/* Opção Modo Escuro Estilo Spotify */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                  theme === "dark"
                    ? "bg-slate-900 dark:bg-slate-950 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  {theme === "dark" && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      Ativo
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Modo Escuro (Estilo Spotify)</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Preto Obsidian (#121212) com cartões escuros (#181818) e detalhes no verde Spotify (#1DB954).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Cards Secundários: Alterar E-mail e Privacidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Alterar E-mail */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alterar E-mail</h3>
                  <p className="text-[10px] text-slate-500">Credencial principal de login</p>
                </div>
              </div>

              {emailMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 transition-all ${
                    emailMsg.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                      : "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                  }`}
                >
                  {emailMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>{emailMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateEmail} className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                    E-mail Atual
                  </span>
                  <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-950/80 rounded-xl text-slate-600 dark:text-slate-400 font-mono text-xs border border-slate-200 dark:border-slate-800/60">
                    {user?.email || "—"}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs">
                    Novo E-mail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="novo.email@exemplo.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Por motivos de segurança, um link de confirmação será enviado para o novo e-mail. A troca só é concluída após a validação.
                </p>

                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  {isUpdatingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span>Solicitar Troca de E-mail</span>
                </button>
              </form>
            </div>

            {/* Card: Privacidade & LGPD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 rounded-3xl space-y-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Privacidade & LGPD</h3>
                    <p className="text-[10px] text-slate-500">Gestão dos seus dados clínicos</p>
                  </div>
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    Conforme o Art. 18 da Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a eliminação definitiva de todos os seus dados pessoais e histórico médico.
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    Essa ação removerá seus exames, medicamentos cadastrados, indicadores e prontuários permanentemente.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="w-full py-2.5 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeletingAccount ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
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

      {/* TAB 4: PLANO & ASSINATURA UNIFICADA */}
      {activeTab === "billing" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Crown className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assinatura Vita4Me</h3>
                <p className="text-xs text-slate-500">Histórico contínuo e inteligência clínica Gemini.</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Plano {profile?.plan_tier === 'family' ? 'FAMÍLIA' : 'INDIVIDUAL'}
            </span>
          </div>

          {cancelMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cancelMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Status da Assinatura */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-slate-500 font-semibold block">Status:</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  profile?.subscription_status === 'active'
                    ? 'bg-emerald-500'
                    : profile?.subscription_status === 'trialing'
                    ? 'bg-blue-500'
                    : profile?.subscription_status === 'past_due'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`} />
                <strong className="text-slate-900 dark:text-white uppercase font-mono">
                  {profile?.subscription_status === 'active' && 'Ativa'}
                  {profile?.subscription_status === 'trialing' && 'Período de Teste'}
                  {profile?.subscription_status === 'past_due' && 'Pendente'}
                  {profile?.subscription_status === 'canceled' && 'Cancelada'}
                  {!['active', 'trialing', 'past_due', 'canceled'].includes(profile?.subscription_status || '') && (profile?.subscription_status || 'Inativo')}
                </strong>
              </div>
            </div>

            {/* Região / Método */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-slate-500 font-semibold block">Região da Cobrança:</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {profile?.billing_provider === 'asaas'
                    ? '🇧🇷 Brasil (Pix / Cartão)'
                    : profile?.billing_provider === 'stripe' || profile?.stripe_customer_id
                    ? '🌍 Exterior'
                    : 'Padrão'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={onOpenBillingModal}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>
                {profile?.subscription_status === 'canceled' || profile?.subscription_status === 'past_due'
                  ? 'Reativar / Regularizar Plano'
                  : 'Fazer Upgrade / Alterar Plano'}
              </span>
            </button>

            {/* Ações específicas por Gateway */}
            {profile?.billing_provider === 'stripe' || profile?.stripe_customer_id ? (
              <button
                onClick={() => openStripeCustomerPortal()}
                className="w-full py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Gerenciar Faturamento e Cartão
              </button>
            ) : (
              (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                  className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 font-semibold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCanceling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Cancelar Assinatura</span>
                  )}
                </button>
              )
            )}
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
