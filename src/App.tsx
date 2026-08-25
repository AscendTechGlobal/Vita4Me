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
  const { user, profile, refreshProfile } = useAuth();
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

  // Transição reativa de tela e disparo de Anamnese Inicial no primeiro acesso
  useEffect(() => {
    if (user) {
      setViewMode("app");
      // Se a anamnese médica inicial ainda não foi concluída no Supabase, abrir modal automaticamente
      if (profile && profile.onboarding_completed === false) {
        setIsOnboardingModalOpen(true);
      }
    } else {
      setViewMode("landing");
    }
  }, [user, profile]);

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
            onSaveCompleted={async (data) => {
              if (isSupabaseConfigured && user) {
                try {
                  await supabase
                    .from('profiles')
                    .update({
                      full_name: data.name,
                      date_of_birth: data.birthDate,
                      gender: data.gender,
                      blood_type: data.bloodType,
                      height_cm: data.height,
                      weight_kg: data.weight,
                      smoking_status: data.smoking,
                      alcohol_status: data.alcohol,
                      activity_level: data.activity,
                      chronic_conditions: data.chronicConditions,
                      allergies: data.allergies,
                      emergency_contact_name: data.emergencyName,
                      emergency_contact_phone: data.emergencyPhone,
                      onboarding_completed: true,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', user.id);
                } catch (err) {
                  console.error("Erro ao salvar anamnese no Supabase:", err);
                }
              }
              await refreshProfile();
              refreshAllData();
              setIsOnboardingModalOpen(false);
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
