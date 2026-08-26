import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useOutletContext } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { AuthPageView } from "./components/AuthPageView";
import { ActiveTab } from "./components/Sidebar";
import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from "./types";

// Lazy-loaded Views
const LandingPageView = lazy(() => import("./components/LandingPageView").then(m => ({ default: m.LandingPageView })));
const DashboardView = lazy(() => import("./components/DashboardView").then(m => ({ default: m.DashboardView })));
const ExamsCentralView = lazy(() => import("./components/ExamsCentralView").then(m => ({ default: m.ExamsCentralView })));
const IndicatorsView = lazy(() => import("./components/IndicatorsView").then(m => ({ default: m.IndicatorsView })));
const TimelineView = lazy(() => import("./components/TimelineView").then(m => ({ default: m.TimelineView })));
const MedicationsView = lazy(() => import("./components/MedicationsView").then(m => ({ default: m.MedicationsView })));
const HabitsView = lazy(() => import("./components/HabitsView").then(m => ({ default: m.HabitsView })));
const HealthAIChatView = lazy(() => import("./components/HealthAIChatView").then(m => ({ default: m.HealthAIChatView })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const AuthConfirmView = lazy(() => import("./components/AuthConfirmView").then(m => ({ default: m.AuthConfirmView })));
const BillingModal = lazy(() => import("./components/BillingModal").then(m => ({ default: m.BillingModal })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
  </div>
);

// Interface para o contexto do Outlet em AppLayout
interface AppLayoutContext {
  activeMember: FamilyMember | null;
  exams: LabExam[];
  indicators: HealthIndicator[];
  medications: Medication[];
  records: HealthRecord[];
  todayHabit: DailyHabit;
  refreshAllData: () => void;
  onOpenExportDossierModal: () => void;
  onOpenBillingModal: () => void;
  onOpenOnboarding: () => void;
}

// ── ROTAS EMBUTIDAS EM /app ──
const TAB_ROUTES: Record<ActiveTab, string> = {
  overview: "/app",
  exams: "/app/exames",
  indicators: "/app/indicadores",
  timeline: "/app/linha-do-tempo",
  medications: "/app/medicamentos",
  habits: "/app/rotina",
  chat: "/app/assistente",
  settings: "/app/configuracoes",
};

const DashboardRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <DashboardView
      activeMember={ctx.activeMember}
      exams={ctx.exams}
      indicators={ctx.indicators}
      medications={ctx.medications}
      records={ctx.records}
      todayHabit={ctx.todayHabit}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab] || "/app")}
      onOpenExportDossierModal={ctx.onOpenExportDossierModal}
      onOpenOnboarding={ctx.onOpenOnboarding}
    />
  );
};

const ExamsRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <ExamsCentralView
      exams={ctx.exams}
      activeMember={ctx.activeMember}
      onRefreshExams={ctx.refreshAllData}
      onBack={() => navigate("/app")}
    />
  );
};

const IndicatorsRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <IndicatorsView
      indicators={ctx.indicators}
      activeMember={ctx.activeMember}
      onRefreshIndicators={ctx.refreshAllData}
      onBack={() => navigate("/app")}
    />
  );
};

const TimelineRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <TimelineView
      records={ctx.records}
      activeMember={ctx.activeMember}
      onRefreshRecords={ctx.refreshAllData}
      onBack={() => navigate("/app")}
    />
  );
};

const MedicationsRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <MedicationsView
      medications={ctx.medications}
      activeMember={ctx.activeMember}
      onRefreshMedications={ctx.refreshAllData}
      onBack={() => navigate("/app")}
    />
  );
};

const HabitsRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <HabitsView
      todayHabit={ctx.todayHabit}
      onRefreshHabit={ctx.refreshAllData}
      onBack={() => navigate("/app")}
    />
  );
};

const ChatRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <HealthAIChatView
      activeMember={ctx.activeMember}
      exams={ctx.exams}
      indicators={ctx.indicators}
      medications={ctx.medications}
      records={ctx.records}
      onBack={() => navigate("/app")}
    />
  );
};

const SettingsRoute: React.FC = () => {
  const ctx = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  return (
    <SettingsView
      onOpenBillingModal={ctx.onOpenBillingModal}
      onOpenOnboarding={ctx.onOpenOnboarding}
      onBack={() => navigate("/app")}
    />
  );
};

// ── COMPONENTE DE WRAPPER DA LANDING PAGE COM SUPORTE A BILLING MODAL ──
const LandingPageWrapper: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isBillingModalOpen, setIsBillingModalOpen] = React.useState(false);

  return (
    <>
      <LandingPageView
        onEnterApp={() => {
          if (user) {
            navigate("/app");
          } else {
            navigate("/login");
          }
        }}
        onOpenAuthModal={() => navigate("/login")}
        onOpenBillingModal={() => setIsBillingModalOpen(true)}
      />

      <Suspense fallback={null}>
        {isBillingModalOpen && (
          <BillingModal
            isOpen={isBillingModalOpen}
            onClose={() => setIsBillingModalOpen(false)}
          />
        )}
      </Suspense>
    </>
  );
};

// ── COMPONENTE DE CONFIRMAÇÃO DE AUTH ──
const AuthConfirmWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <AuthConfirmView onGoToLogin={() => navigate("/login")} />;
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* ── ROTAS PÚBLICAS ── */}
              <Route path="/" element={<LandingPageWrapper />} />
              <Route path="/login" element={<AuthPageView initialTab="login" />} />
              <Route path="/cadastro" element={<AuthPageView initialTab="signup" />} />
              <Route path="/auth/confirm" element={<AuthConfirmWrapper />} />

              {/* ── ROTAS PROTEGIDAS /app/* ── */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardRoute />} />
                <Route path="exames" element={<ExamsRoute />} />
                <Route path="indicadores" element={<IndicatorsRoute />} />
                <Route path="linha-do-tempo" element={<TimelineRoute />} />
                <Route path="medicamentos" element={<MedicationsRoute />} />
                <Route path="rotina" element={<HabitsRoute />} />
                <Route path="assistente" element={<ChatRoute />} />
                <Route path="configuracoes" element={<SettingsRoute />} />
              </Route>

              {/* ── FALLBACK ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
