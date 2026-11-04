import React, { useState, useEffect, Suspense, lazy } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import {
  getExams,
  getIndicators,
  getMedications,
  getHealthRecords,
  getFamilyMembers,
  getTodayHabit,
  getActiveFamilyMemberId,
  setActiveFamilyMemberId,
  saveFamilyMember,
  deleteFamilyMember,
  syncAllFromSupabase,
  ensureStorageUserScope,
} from "../lib/healthStorage";
import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from "../types";
import { trackEvent, trackPageView } from "../lib/analytics";
import { supabase, isSupabaseConfigured, getAuthHeaders } from "../lib/supabase";
import { LegalDocumentsModal, LegalTab } from "../components/LegalDocumentsModal";

// Lazy-loaded Modals
const BillingModal = lazy(() => import("../components/BillingModal").then(m => ({ default: m.BillingModal })));
const ExportDossierModal = lazy(() => import("../components/ExportDossierModal").then(m => ({ default: m.ExportDossierModal })));
const FamilyProfilesModal = lazy(() => import("../components/FamilyProfilesModal").then(m => ({ default: m.FamilyProfilesModal })));
const HealthOnboardingModal = lazy(() => import("../components/HealthOnboardingModal").then(m => ({ default: m.HealthOnboardingModal })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
  </div>
);

export const AppLayout: React.FC = () => {
  const { user, profile, isLoading: authLoading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isExportDossierOpen, setIsExportDossierOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [showConsentGate, setShowConsentGate] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentHealth, setConsentHealth] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);

  // Data state
  const [exams, setExams] = useState<LabExam[]>([]);
  const [indicators, setIndicators] = useState<HealthIndicator[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activeMemberId, setActiveMemberIdState] = useState<string>("fam-me");
  const [todayHabit, setTodayHabit] = useState<DailyHabit>({
    user_id: "usr-default",
    log_date: new Date().toISOString().split("T")[0],
    water_ml: 0,
    sleep_hours: 0,
    exercise_minutes: 0,
  });

  const refreshAllData = () => {
    setExams(getExams());
    setIndicators(getIndicators());
    setMedications(getMedications());
    setRecords(getHealthRecords());
    setFamilyMembers(getFamilyMembers());
    setActiveMemberIdState(getActiveFamilyMemberId());
    setTodayHabit(getTodayHabit());
  };

  useEffect(() => {
    ensureStorageUserScope(user?.id || null);
    refreshAllData();

    // Hidratação assíncrona do Supabase ao autenticar
    if (user) {
      syncAllFromSupabase().then((synced) => {
        if (synced) refreshAllData();
      });
    }

    // Detecção segura de retorno de Checkout com Sucesso
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("checkout_success") === "true") {
      const plan = (urlParams.get("plan") || "individual") as "individual" | "family";
      const alreadyTracked = sessionStorage.getItem("vita4me_checkout_tracked");
      if (!alreadyTracked) {
        sessionStorage.setItem("vita4me_checkout_tracked", "true");
        trackEvent("trial_started", { plan_tier: plan });
        trackEvent("subscription_activated", { plan_tier: plan });
      }
    }
  }, [user]);

  // Transição reativa e verificação de consentimento OAuth (A03) + Anamnese Inicial
  useEffect(() => {
    if (authLoading || !user) return;

    const checkConsentsAndOnboarding = async () => {
      const hasConsentMetadata = Boolean(user.user_metadata?.consents_accepted_v2);
      const pendingRaw = sessionStorage.getItem("vita4me_pending_oauth_consents");

      if (pendingRaw) {
        try {
          const parsed = JSON.parse(pendingRaw);
          if (parsed?.termsAccepted && parsed?.healthDataAccepted) {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/auth/consents", {
              method: "POST",
              headers,
              body: JSON.stringify({
                termsAccepted: true,
                privacyAccepted: true,
                healthDataAccepted: true,
                documentVersion: parsed.documentVersion || "2.0",
                source: "oauth_signup",
              }),
            });
            if (res.ok) {
              sessionStorage.removeItem("vita4me_pending_oauth_consents");
              setShowConsentGate(false);
              if (profile && profile.onboarding_completed === false) {
                setIsOnboardingModalOpen(true);
              }
              return;
            }
          }
        } catch {}
      }

      const isOAuthUser =
        user.app_metadata?.provider === "google" ||
        (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google"));

      if (isOAuthUser && !hasConsentMetadata && profile && profile.onboarding_completed === false) {
        setShowConsentGate(true);
        return;
      }

      if (profile && profile.onboarding_completed === false) {
        setIsOnboardingModalOpen(true);
      }
    };

    checkConsentsAndOnboarding();
  }, [user, profile, authLoading]);

  // Titular estruturado garantido como primeiro membro do prontuário
  const titularMember: FamilyMember = {
    id: "fam-me",
    user_id: user?.id || "usr-current",
    name: profile?.full_name || user?.email?.split('@')[0] || "Titular (Você)",
    relationship: "Titular",
    date_of_birth: profile?.date_of_birth || undefined,
    gender: profile?.gender || undefined,
    blood_type: profile?.blood_type || undefined,
    height_cm: profile?.height_cm || undefined,
    weight_kg: profile?.weight_kg || undefined,
    smoking_status: profile?.smoking_status || undefined,
    alcohol_status: profile?.alcohol_status || undefined,
    activity_level: profile?.activity_level || undefined,
    chronic_conditions: profile?.chronic_conditions || [],
    allergies: profile?.allergies || [],
    is_active: true,
    onboarding_completed: profile?.onboarding_completed ?? true,
    created_at: profile?.created_at || new Date().toISOString(),
  };

  const allMembers: FamilyMember[] = [
    titularMember,
    ...familyMembers.filter(m => m.id !== "fam-me" && m.relationship !== "Titular")
  ];

  const activeMember = allMembers.find(f => f.id === activeMemberId) || titularMember;

  const handleSelectFamilyMember = (id: string) => {
    setActiveFamilyMemberId(id);
    setActiveMemberIdState(id);
    trackEvent("family_profile_switched", { is_family_context: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white dark:selection:bg-[#1DB954] dark:selection:text-black">
      <Navbar
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        activeMember={activeMember}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
        onOpenBillingModal={() => setIsBillingModalOpen(true)}
        onOpenAuthModal={() => navigate("/login")}
        onOpenExportDossierModal={() => setIsExportDossierOpen(true)}
        onToggleLandingPage={() => navigate("/")}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenBillingModal={() => setIsBillingModalOpen(true)}
          examsCount={exams.length}
          medicationsCount={medications.filter(m => m.is_active).length}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950">
          {/* Alerta de Dunning / Inadimplência (past_due) */}
          {profile?.subscription_status === 'past_due' && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 sticky top-0 z-30 backdrop-blur-xs shadow-xs animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Renovação Pendente:</strong> A sua mensalidade mais recente não foi confirmada. Regularize seu pagamento via Pix ou Cartão para evitar a interrupção das análises por inteligência artificial.
                </span>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(true)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs whitespace-nowrap transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
              >
                <span>Regularizar Agora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Suspense fallback={<LoadingSpinner />}>
            <Outlet
              context={{
                activeMember,
                familyMembers: allMembers,
                onSelectFamilyMember: handleSelectFamilyMember,
                exams,
                indicators,
                medications,
                records,
                todayHabit,
                refreshAllData,
                onOpenExportDossierModal: () => setIsExportDossierOpen(true),
                onOpenBillingModal: () => setIsBillingModalOpen(true),
                onOpenOnboarding: () => setIsOnboardingModalOpen(true),
              }}
            />
          </Suspense>
        </main>
      </div>

      {/* Global Modals in Suspense */}
      <Suspense fallback={null}>
        {isBillingModalOpen && (
          <BillingModal
            isOpen={isBillingModalOpen}
            onClose={() => setIsBillingModalOpen(false)}
          />
        )}

        {isExportDossierOpen && (
          <ExportDossierModal
            isOpen={isExportDossierOpen}
            onClose={() => setIsExportDossierOpen(false)}
            profile={profile}
            activeMember={activeMember}
            exams={exams}
            indicators={indicators}
            medications={medications}
            records={records}
            todayHabit={todayHabit}
          />
        )}

        {isFamilyModalOpen && (
          <FamilyProfilesModal
            isOpen={isFamilyModalOpen}
            onClose={() => setIsFamilyModalOpen(false)}
            members={allMembers}
            activeMemberId={activeMemberId}
            onSelectMember={handleSelectFamilyMember}
            onAddMember={async (newM) => {
              await saveFamilyMember(newM);
              refreshAllData();
            }}
            onDeleteMember={async (id) => {
              try {
                await deleteFamilyMember(id);
                if (activeMemberId === id) {
                  handleSelectFamilyMember("fam-me");
                }
                refreshAllData();
              } catch (err: any) {
                alert(err?.message || "Não foi possível remover o perfil familiar no servidor.");
              }
            }}
          />
        )}

        {isOnboardingModalOpen && (
          <HealthOnboardingModal
            isOpen={isOnboardingModalOpen}
            onClose={() => setIsOnboardingModalOpen(false)}
            targetType="user"
            initialName={profile?.full_name || ""}
            initialProfile={profile}
            onSaveCompleted={async (data) => {
              if (!user || !user.id) {
                return { success: false, error: "Sessão de usuário não encontrada. Faça login novamente." };
              }

              if (!isSupabaseConfigured) {
                return { success: false, error: "Conexão com o servidor não configurada." };
              }

              // ── A) WHITELIST: Somente colunas que existem em public.profiles ──
              const validBirthDate = data.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)
                ? data.birthDate
                : null;
              const validHeight = Number(data.height) > 0 ? Number(data.height) : null;
              const validWeight = Number(data.weight) > 0 ? Number(data.weight) : null;

              const profilePayload: Record<string, unknown> = {
                full_name: data.name?.trim() || null,
                date_of_birth: validBirthDate,
                gender: data.gender?.trim() || null,
                blood_type: data.bloodType?.trim() || null,
                height_cm: validHeight,
                weight_kg: validWeight,
                smoking_status: data.smoking?.trim() || null,
                alcohol_status: data.alcohol?.trim() || null,
                activity_level: data.activity?.trim() || null,
                chronic_conditions: Array.isArray(data.chronicConditions)
                  ? data.chronicConditions.map((c: string) => c.trim()).filter((c: string) => c && c !== "Nenhuma condição crônica")
                  : [],
                allergies: Array.isArray(data.allergies)
                  ? data.allergies.map((a: string) => a.trim()).filter(Boolean)
                  : [],
                emergency_contact_name: data.emergencyName?.trim() || null,
                emergency_contact_phone: data.emergencyPhone?.trim() || null,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
              };

              // ── B) UPDATE profiles (sem .select() encadeado) ──
              const { error: updateError } = await supabase
                .from("profiles")
                .update(profilePayload)
                .eq("id", user.id);

              if (updateError) {
                console.error("[ONBOARDING][profiles.update]", {
                  code: updateError.code,
                  message: updateError.message,
                  details: updateError.details,
                  hint: updateError.hint,
                });
                return {
                  success: false,
                  error: `Erro ao salvar perfil [${updateError.code || "UNKNOWN"}]: ${updateError.message || "Erro desconhecido"}`,
                };
              }

              // ── C) SELECT separado para confirmar persistência ──
              const { data: verifyRow, error: verifyError } = await supabase
                .from("profiles")
                .select("onboarding_completed")
                .eq("id", user.id)
                .maybeSingle();

              if (verifyError) {
                console.error("[ONBOARDING][profiles.verify]", {
                  code: verifyError.code,
                  message: verifyError.message,
                  details: verifyError.details,
                  hint: verifyError.hint,
                });
                return {
                  success: false,
                  error: `Erro ao verificar perfil [${verifyError.code || "UNKNOWN"}]: ${verifyError.message || "Erro desconhecido"}`,
                };
              }

              if (!verifyRow || verifyRow.onboarding_completed !== true) {
                console.error("[ONBOARDING][profiles.verify] onboarding_completed não é true após UPDATE");
                return {
                  success: false,
                  error: "O perfil foi salvo mas onboarding_completed não foi confirmado. Tente novamente.",
                };
              }

              // ── D) DADOS OPCIONAIS — falha aqui NÃO impede conclusão ──

              // D.1) Indicador de Peso
              if (validWeight) {
                const { error: indError } = await supabase
                  .from("health_indicators")
                  .insert({
                    user_id: user.id,
                    name: "Peso",
                    category: "Vital",
                    value: validWeight,
                    unit: "kg",
                    measured_at: new Date().toISOString(),
                    status: "normal",
                  });
                if (indError) {
                  console.error("[ONBOARDING][health_indicators.insert]", {
                    code: indError.code,
                    message: indError.message,
                    details: indError.details,
                    hint: indError.hint,
                  });
                }
              }

              // D.2) Medicamentos (apenas com nome real preenchido)
              if (Array.isArray(data.medications)) {
                for (const med of data.medications) {
                  if (med?.name?.trim()) {
                    const { error: medError } = await supabase
                      .from("medications")
                      .insert({
                        user_id: user.id,
                        name: med.name.trim(),
                        dosage: med.dosage?.trim() || "1 dose",
                        frequency: med.frequency?.trim() || "1x ao dia",
                        schedule_times: med.schedule ? [med.schedule] : ["08:00"],
                        is_continuous: true,
                        is_active: true,
                      });
                    if (medError) {
                      console.error("[ONBOARDING][medications.insert]", {
                        code: medError.code,
                        message: medError.message,
                        details: medError.details,
                        hint: medError.hint,
                      });
                    }
                  }
                }
              }

              // D.3) Alergias como health_records (apenas com texto real)
              if (Array.isArray(data.allergies)) {
                for (const al of data.allergies) {
                  if (al?.trim()) {
                    const { error: recError } = await supabase
                      .from("health_records")
                      .insert({
                        user_id: user.id,
                        record_type: "alergia",
                        title: `Alergia: ${al.trim()}`,
                        description: "Declarada na anamnese médica inicial.",
                        event_date: new Date().toISOString().split("T")[0],
                      });
                    if (recError) {
                      console.error("[ONBOARDING][health_records.insert]", {
                        code: recError.code,
                        message: recError.message,
                        details: recError.details,
                        hint: recError.hint,
                      });
                    }
                  }
                }
              }

              // ── E) REFRESH e FECHAMENTO ──
              await refreshProfile();
              await syncAllFromSupabase();
              refreshAllData();
              setIsOnboardingModalOpen(false);
              return { success: true };
            }}
          />
        )}

        {showConsentGate && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Consentimento Obrigatório (LGPD)
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Para prosseguir com a criação do seu prontuário digital via conta Google, confirme abaixo a leitura e aceite dos documentos legais e o consentimento para tratamento de dados pessoais sensíveis de saúde.
                </p>
              </div>

              {consentError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                  {consentError}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    Li e concordo com os{" "}
                    <button
                      type="button"
                      onClick={() => setLegalTab("termos")}
                      className="text-emerald-600 dark:text-emerald-400 underline font-semibold"
                    >
                      Termos de Uso
                    </button>{" "}
                    e a{" "}
                    <button
                      type="button"
                      onClick={() => setLegalTab("privacidade")}
                      className="text-emerald-600 dark:text-emerald-400 underline font-semibold"
                    >
                      Política de Privacidade
                    </button>{" "}
                    (Versão 2.0).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentHealth}
                    onChange={(e) => setConsentHealth(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    Autorizo de forma livre, informada e destacada o tratamento dos meus{" "}
                    <button
                      type="button"
                      onClick={() => setLegalTab("consentimento")}
                      className="text-emerald-600 dark:text-emerald-400 underline font-semibold"
                    >
                      dados pessoais sensíveis de saúde
                    </button>{" "}
                    (Art. 11 da LGPD) para organização do prontuário e auxílio informativo por IA.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate("/login", { replace: true });
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Recusar e Sair
                </button>
                <button
                  type="button"
                  disabled={consentSaving || !consentTerms || !consentHealth}
                  onClick={async () => {
                    setConsentError(null);
                    setConsentSaving(true);
                    try {
                      const headers = await getAuthHeaders();
                      const res = await fetch("/api/auth/consents", {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                          termsAccepted: consentTerms,
                          privacyAccepted: consentTerms,
                          healthDataAccepted: consentHealth,
                          documentVersion: "2.0",
                          source: "oauth_consent_gate",
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok || !data.success) {
                        throw new Error(data.error || "Não foi possível registrar seu consentimento no servidor.");
                      }
                      await supabase.auth.refreshSession().catch(() => {});
                      setShowConsentGate(false);
                      if (profile && profile.onboarding_completed === false) {
                        setIsOnboardingModalOpen(true);
                      }
                    } catch (err: any) {
                      setConsentError(err?.message || "Erro ao registrar consentimentos.");
                    } finally {
                      setConsentSaving(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
                >
                  {consentSaving ? "Registrando..." : "Confirmar e Continuar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {legalTab && (
          <LegalDocumentsModal
            isOpen={!!legalTab}
            onClose={() => setLegalTab(null)}
            initialTab={legalTab}
          />
        )}
      </Suspense>
    </div>
  );
};
