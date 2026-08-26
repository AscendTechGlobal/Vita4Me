import React, { useState, useEffect, Suspense, lazy } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
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
} from "../lib/healthStorage";
import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from "../types";
import { trackEvent, trackPageView } from "../lib/analytics";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

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
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isExportDossierOpen, setIsExportDossierOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

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
    refreshAllData();

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
  }, []);

  // Transição reativa e disparo de Anamnese Inicial quando profile for comprovadamente onboarding_completed = false
  useEffect(() => {
    if (authLoading) return;
    if (user && profile && profile.onboarding_completed === false) {
      setIsOnboardingModalOpen(true);
    }
  }, [user, profile, authLoading]);

  const activeMember = familyMembers.find(f => f.id === activeMemberId) || familyMembers[0] || null;

  const handleSelectFamilyMember = (id: string) => {
    setActiveFamilyMemberId(id);
    setActiveMemberIdState(id);
    trackEvent("family_profile_switched", { is_family_context: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#7AC943] selection:text-[#0A3B2E]">
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
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet
              context={{
                activeMember,
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
          />
        )}

        {isFamilyModalOpen && (
          <FamilyProfilesModal
            isOpen={isFamilyModalOpen}
            onClose={() => setIsFamilyModalOpen(false)}
            members={familyMembers}
            activeMemberId={activeMemberId}
            onSelectMember={handleSelectFamilyMember}
            onAddMember={(newM) => {
              saveFamilyMember(newM);
              refreshAllData();
            }}
            onDeleteMember={(id) => {
              deleteFamilyMember(id);
              refreshAllData();
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
                        tags: ["Alergia", "Anamnese"],
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
              refreshAllData();
              setIsOnboardingModalOpen(false);
              return { success: true };
            }}
          />
        )}
      </Suspense>
    </div>
  );
};
