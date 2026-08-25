import React, { useState, useEffect, Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Navbar } from "./components/Navbar";
import { Sidebar, ActiveTab } from "./components/Sidebar";
import { LandingPageView } from "./components/LandingPageView";

// Lazy-loaded Views (Code-Splitting for Top Performance)
const DashboardView = lazy(() => import("./components/DashboardView").then(m => ({ default: m.DashboardView })));
const ExamsCentralView = lazy(() => import("./components/ExamsCentralView").then(m => ({ default: m.ExamsCentralView })));
const IndicatorsView = lazy(() => import("./components/IndicatorsView").then(m => ({ default: m.IndicatorsView })));
const TimelineView = lazy(() => import("./components/TimelineView").then(m => ({ default: m.TimelineView })));
const MedicationsView = lazy(() => import("./components/MedicationsView").then(m => ({ default: m.MedicationsView })));
const HabitsView = lazy(() => import("./components/HabitsView").then(m => ({ default: m.HabitsView })));
const HealthAIChatView = lazy(() => import("./components/HealthAIChatView").then(m => ({ default: m.HealthAIChatView })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const AuthConfirmView = lazy(() => import("./components/AuthConfirmView").then(m => ({ default: m.AuthConfirmView })));

// Lazy-loaded Modals
const BillingModal = lazy(() => import("./components/BillingModal").then(m => ({ default: m.BillingModal })));
const AuthModal = lazy(() => import("./components/AuthModal").then(m => ({ default: m.AuthModal })));
const ExportDossierModal = lazy(() => import("./components/ExportDossierModal").then(m => ({ default: m.ExportDossierModal })));
const FamilyProfilesModal = lazy(() => import("./components/FamilyProfilesModal").then(m => ({ default: m.FamilyProfilesModal })));
const HealthOnboardingModal = lazy(() => import("./components/HealthOnboardingModal").then(m => ({ default: m.HealthOnboardingModal })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
  </div>
);

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
  deleteFamilyMember
} from "./lib/healthStorage";
import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from "./types";
import { trackEvent, trackPageView } from "./lib/analytics";

const MainAppContent: React.FC = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const [viewMode, setViewMode] = useState<"landing" | "app">("landing");
  const [currentTab, setCurrentTab] = useState<ActiveTab>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfirmRoute, setIsConfirmRoute] = useState<boolean>(() => {
    return (
      window.location.pathname === "/auth/confirm" ||
      window.location.pathname.startsWith("/auth/confirm") ||
      window.location.hash.includes("type=signup") ||
      window.location.hash.includes("type=email_confirmation")
    );
  });

  // Modals state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
    if (urlParams.get('checkout_success') === 'true') {
      const plan = (urlParams.get('plan') || 'individual') as 'individual' | 'family';
      const alreadyTracked = sessionStorage.getItem('vita4me_checkout_tracked');
      if (!alreadyTracked) {
        sessionStorage.setItem('vita4me_checkout_tracked', 'true');
        trackEvent('trial_started', { plan_tier: plan });
        trackEvent('subscription_activated', { plan_tier: plan });
      }
      if (user) {
        setViewMode('app');
      }
    }
  }, []);

  // Transição reativa de tela e disparo de Anamnese Inicial estritamente quando profile estiver carregado
  useEffect(() => {
    if (isLoading) return; // Aguardar carregamento completo de auth e profile

    if (user) {
      setViewMode("app");
      // Abrir anamnese SOMENTE se profile carregado e onboarding_completed for comprovadamente false
      if (profile && profile.onboarding_completed === false) {
        setIsOnboardingModalOpen(true);
      }
    } else {
      setViewMode("landing");
    }
  }, [user, profile, isLoading]);

  const activeMember = familyMembers.find(f => f.id === activeMemberId) || familyMembers[0] || null;

  const handleSelectFamilyMember = (id: string) => {
    setActiveFamilyMemberId(id);
    setActiveMemberIdState(id);
    trackEvent('family_profile_switched', { is_family_context: true });
  };

  const handleNavigate = (tab: ActiveTab) => {
    setCurrentTab(tab);
    trackPageView('/app/' + tab, 'Vita4Me — ' + tab);
    if (tab === 'overview') {
      trackEvent('dashboard_viewed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#7AC943] selection:text-[#0A3B2E]">
      {isConfirmRoute ? (
        <Suspense fallback={<LoadingSpinner />}>
          <AuthConfirmView
            onGoToLogin={() => {
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, "/");
              }
              setIsConfirmRoute(false);
              if (user) {
                setViewMode("app");
              } else {
                setViewMode("landing");
                setIsAuthModalOpen(true);
              }
            }}
          />
        </Suspense>
      ) : viewMode === "landing" || !user ? (
        <LandingPageView
          onEnterApp={() => {
            if (user) {
              setViewMode("app");
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenBillingModal={() => setIsBillingModalOpen(true)}
        />
      ) : (
        <>
          <Navbar
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            activeMember={activeMember}
            onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenExportDossierModal={() => setIsExportDossierOpen(true)}
            onToggleLandingPage={() => setViewMode("landing")}
          />

          <div className="flex-1 flex overflow-hidden">
            <Sidebar
              currentTab={currentTab}
              onNavigate={handleNavigate}
              isOpenMobile={isMobileMenuOpen}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
              onOpenBillingModal={() => setIsBillingModalOpen(true)}
              examsCount={exams.length}
              medicationsCount={medications.filter(m => m.is_active).length}
            />

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950">
          <Suspense fallback={<LoadingSpinner />}>
            {currentTab === "overview" && (
              <DashboardView
                activeMember={activeMember}
                exams={exams}
                indicators={indicators}
                medications={medications}
                records={records}
                todayHabit={todayHabit}
                onNavigate={handleNavigate}
                onOpenExportDossierModal={() => setIsExportDossierOpen(true)}
                onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
              />
            )}

            {currentTab === "exams" && (
              <ExamsCentralView
                exams={exams}
                activeMember={activeMember}
                onRefreshExams={refreshAllData}
                onBack={() => handleNavigate("overview")}
              />
            )}

            {currentTab === "indicators" && (
              <IndicatorsView
                indicators={indicators}
                activeMember={activeMember}
                onRefreshIndicators={refreshAllData}
                onBack={() => handleNavigate("overview")}
              />
            )}

            {currentTab === "timeline" && (
              <TimelineView
                records={records}
                activeMember={activeMember}
                onRefreshRecords={refreshAllData}
                onBack={() => handleNavigate("overview")}
              />
            )}

            {currentTab === "medications" && (
              <MedicationsView
                medications={medications}
                activeMember={activeMember}
                onRefreshMedications={refreshAllData}
                onBack={() => handleNavigate("overview")}
              />
            )}

            {currentTab === "habits" && (
              <HabitsView
                todayHabit={todayHabit}
                onRefreshHabit={refreshAllData}
                onBack={() => handleNavigate("overview")}
              />
            )}

            {currentTab === "chat" && (
              <HealthAIChatView
                activeMember={activeMember}
                exams={exams}
                indicators={indicators}
                medications={medications}
                records={records}
                onBack={() => handleNavigate("overview")}
              />
            )}

            {currentTab === "settings" && (
              <SettingsView
                onOpenBillingModal={() => setIsBillingModalOpen(true)}
                onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
                onBack={() => handleNavigate("overview")}
              />
            )}
          </Suspense>
        </main>
      </div>
      </>
      )}

      {/* Global Modals in Suspense */}
      <Suspense fallback={null}>
        {isBillingModalOpen && (
          <BillingModal
            isOpen={isBillingModalOpen}
            onClose={() => setIsBillingModalOpen(false)}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
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
              if (!user) {
                return { success: false, error: "Sessão de usuário não encontrada. Faça login novamente." };
              }

              // 1. Normalização estrita de dados antes do envio
              const validBirthDate = data.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)
                ? data.birthDate
                : null;

              const validHeight = Number(data.height) > 0 ? Number(data.height) : null;
              const validWeight = Number(data.weight) > 0 ? Number(data.weight) : null;

              const profilePayload = {
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

              if (isSupabaseConfigured) {
                // 2. Persistir Perfil no Supabase (com select array resiliente)
                const { data: updatedRows, error: profileError } = await supabase
                  .from('profiles')
                  .update(profilePayload)
                  .eq('id', user.id)
                  .select();

                if (profileError) {
                  console.error("Supabase Error [profiles.update]:", {
                    code: profileError.code,
                    message: profileError.message,
                    details: profileError.details,
                    hint: profileError.hint,
                  });
                  return {
                    success: false,
                    error: "Não foi possível salvar sua anamnese no servidor. Tente novamente.",
                  };
                }

                if (!updatedRows || updatedRows.length === 0 || updatedRows[0]?.onboarding_completed !== true) {
                  // Fallback se a linha ainda não existia em profiles
                  const fallbackInsertPayload = {
                    id: user.id,
                    email: user.email || '',
                    ...profilePayload,
                    plan_tier: 'individual',
                    subscription_status: 'inactive',
                    ai_credits: 0,
                  };
                  const { data: insertedRow, error: insertError } = await supabase
                    .from('profiles')
                    .insert(fallbackInsertPayload)
                    .select()
                    .single();

                  if (insertError || !insertedRow || insertedRow.onboarding_completed !== true) {
                    console.error("Supabase Error [profiles.insert fallback]:", {
                      code: insertError?.code,
                      message: insertError?.message,
                      details: insertError?.details,
                      hint: insertError?.hint,
                    });
                    return {
                      success: false,
                      error: "Não foi possível confirmar a gravação do perfil no banco de dados. Tente novamente.",
                    };
                  }
                }

                // 3. Persistir Indicador de Peso inicial no Supabase (se fornecido)
                if (validWeight) {
                  const { error: indError } = await supabase
                    .from('health_indicators')
                    .insert({
                      user_id: user.id,
                      name: 'Peso',
                      category: 'Vital',
                      value: validWeight,
                      unit: 'kg',
                      measured_at: new Date().toISOString(),
                      status: 'normal',
                    });
                  if (indError) {
                    console.error("Supabase Error [health_indicators.insert]:", {
                      code: indError.code,
                      message: indError.message,
                      details: indError.details,
                      hint: indError.hint,
                    });
                  }
                }

                // 4. Persistir Medicamentos contínuos no Supabase (se fornecidos)
                if (Array.isArray(data.medications) && data.medications.length > 0) {
                  for (const med of data.medications) {
                    if (med && med.name && med.name.trim()) {
                      const { error: medError } = await supabase
                        .from('medications')
                        .insert({
                          user_id: user.id,
                          name: med.name.trim(),
                          dosage: med.dosage?.trim() || '1 dose',
                          frequency: med.frequency?.trim() || '1x ao dia',
                          schedule_times: med.schedule ? [med.schedule] : ['08:00'],
                          is_continuous: true,
                          is_active: true,
                          updated_at: new Date().toISOString(),
                        });
                      if (medError) {
                        console.error("Supabase Error [medications.insert]:", {
                          code: medError.code,
                          message: medError.message,
                          details: medError.details,
                          hint: medError.hint,
                        });
                      }
                    }
                  }
                }

                // 5. Persistir Alergias no histórico clínico do Supabase (se fornecidas)
                if (Array.isArray(data.allergies) && data.allergies.length > 0) {
                  for (const al of data.allergies) {
                    if (al && al.trim()) {
                      const { error: recError } = await supabase
                        .from('health_records')
                        .insert({
                          user_id: user.id,
                          record_type: 'alergia',
                          title: `Alergia: ${al.trim()}`,
                          description: 'Declarada na anamnese médica inicial.',
                          event_date: new Date().toISOString().split('T')[0],
                          tags: ['Alergia', 'Anamnese'],
                          updated_at: new Date().toISOString(),
                        });
                      if (recError) {
                        console.error("Supabase Error [health_records.insert]:", {
                          code: recError.code,
                          message: recError.message,
                          details: recError.details,
                          hint: recError.hint,
                        });
                      }
                    }
                  }
                }
              }

              // 6. Atualizar estado global e fechar modal
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

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
