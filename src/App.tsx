import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { OverviewTab } from './components/OverviewTab';
import { ExamsTab } from './components/ExamsTab';
import { MetricsTab } from './components/MetricsTab';
import { AppointmentsTab } from './components/AppointmentsTab';
import { MedicationsTab } from './components/MedicationsTab';
import { VaccinesAndAllergiesTab } from './components/VaccinesAndAllergiesTab';
import { HabitsTab } from './components/HabitsTab';
import { DocumentsTab } from './components/DocumentsTab';
import { AssistantChatTab } from './components/AssistantChatTab';
import { InstitutionalTab } from './components/InstitutionalTab';
import { TranslateExamModal } from './components/TranslateExamModal';
import { ShareModal } from './components/ShareModal';
import { AddRecordModal } from './components/AddRecordModal';
import { AuthModal } from './components/AuthModal';
import { MedicationNotificationToast } from './components/MedicationNotificationToast';
import { checkScheduledMedications } from './utils/notificationManager';
import { useAuth } from './contexts/AuthContext';

import { 
  initialUserProfile, 
  initialExams, 
  initialMedicalRecords, 
  initialMetrics, 
  initialMedications, 
  initialVaccines, 
  initialAllergies, 
  initialProcedures, 
  initialDailyHabits, 
  initialDocuments 
} from './data/initialData';

import { 
  Exam, 
  MetricEntry, 
  Medication, 
  MedicalRecord, 
  Vaccine, 
  Allergy, 
  DailyHabits, 
  DocumentItem 
} from './types';

export default function App() {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Domain State
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(initialMedicalRecords);
  const [metrics, setMetrics] = useState<MetricEntry[]>(initialMetrics);
  const [medications, setMedications] = useState<Medication[]>(initialMedications);
  const [vaccines, setVaccines] = useState<Vaccine[]>(initialVaccines);
  const [allergies, setAllergies] = useState<Allergy[]>(initialAllergies);
  const [procedures, setProcedures] = useState(initialProcedures);
  const [dailyHabits, setDailyHabits] = useState<DailyHabits>(initialDailyHabits);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);

  // Active in-app medication reminder toast state
  const [activeReminder, setActiveReminder] = useState<{
    medication: Medication;
    time: string;
  } | null>(null);

  // Background timer to check scheduled medication reminders
  useEffect(() => {
    // Initial check
    checkScheduledMedications(medications, (med, time) => {
      setActiveReminder({ medication: med, time });
    });

    const interval = setInterval(() => {
      checkScheduledMedications(medications, (med, time) => {
        setActiveReminder({ medication: med, time });
      });
    }, 20000);

    return () => clearInterval(interval);
  }, [medications]);

  // Modals
  const [selectedExamToTranslate, setSelectedExamToTranslate] = useState<Exam | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Handlers
  const handleAddExam = (newExam: Exam) => setExams(prev => [newExam, ...prev]);
  const handleAddMetric = (newMetric: MetricEntry) => setMetrics(prev => [...prev, newMetric]);
  const handleAddMedication = (newMed: Medication) => setMedications(prev => [newMed, ...prev]);
  const handleAddRecord = (newRec: MedicalRecord) => setMedicalRecords(prev => [newRec, ...prev]);
  const handleAddVaccine = (newVax: Vaccine) => setVaccines(prev => [newVax, ...prev]);
  const handleAddAllergy = (newAlg: Allergy) => setAllergies(prev => [newAlg, ...prev]);
  const handleAddDocument = (newDoc: DocumentItem) => setDocuments(prev => [newDoc, ...prev]);

  const handleUpdateWater = (amountMl: number) => {
    setDailyHabits(prev => ({
      ...prev,
      waterIntakeMl: prev.waterIntakeMl + amountMl
    }));
  };

  const handleToggleMedActive = (medId: string) => {
    setMedications(prev => prev.map(m => m.id === medId ? { ...m, active: !m.active } : m));
  };

  const pendingVaccinesCount = vaccines.filter(v => v.status === 'Pendente').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Active Medication Reminder Toast */}
      {activeReminder && (
        <MedicationNotificationToast
          medication={activeReminder.medication}
          time={activeReminder.time}
          onMarkAsTaken={() => {
            setActiveReminder(null);
          }}
          onSnooze={(minutes) => {
            setActiveReminder(null);
            setTimeout(() => {
              setActiveReminder(activeReminder);
            }, minutes * 60 * 1000);
          }}
          onDismiss={() => setActiveReminder(null)}
        />
      )}

      {/* Top Navbar with dynamic Auth */}
      <Navbar
        userProfile={userProfile}
        onOpenAddModal={() => setIsAddRecordModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenInstitutionalModal={() => setActiveTab('institutional')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Full-Width Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-0">
        
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          examsCount={exams.length}
          medicationsCount={medications.filter(m => m.active).length}
          vaccinesPendingCount={pendingVaccinesCount}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewTab
              userProfile={userProfile}
              exams={exams}
              medicalRecords={medicalRecords}
              metrics={metrics}
              medications={medications}
              vaccines={vaccines}
              dailyHabits={dailyHabits}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenTranslateExam={(exam) => setSelectedExamToTranslate(exam)}
              onUpdateWater={handleUpdateWater}
            />
          )}

          {activeTab === 'exams' && (
            <ExamsTab
              exams={exams}
              onOpenTranslateModal={(exam) => setSelectedExamToTranslate(exam)}
              onAddExam={handleAddExam}
            />
          )}

          {activeTab === 'metrics' && (
            <MetricsTab
              metrics={metrics}
              onAddMetric={handleAddMetric}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsTab
              medicalRecords={medicalRecords}
              userProfile={userProfile}
              exams={exams}
              medications={medications}
              onAddRecord={handleAddRecord}
            />
          )}

          {activeTab === 'medications' && (
            <MedicationsTab
              medications={medications}
              onAddMedication={handleAddMedication}
              onToggleActive={handleToggleMedActive}
            />
          )}

          {activeTab === 'vaccines' || activeTab === 'allergies' ? (
            <VaccinesAndAllergiesTab
              vaccines={vaccines}
              allergies={allergies}
              procedures={procedures}
              onAddVaccine={handleAddVaccine}
              onAddAllergy={handleAddAllergy}
            />
          ) : null}

          {activeTab === 'habits' && (
            <HabitsTab
              dailyHabits={dailyHabits}
              onUpdateHabits={setDailyHabits}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              onAddDocument={handleAddDocument}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantChatTab
              userProfile={userProfile}
              exams={exams}
              medicalRecords={medicalRecords}
              medications={medications}
              vaccines={vaccines}
              dailyHabits={dailyHabits}
            />
          )}

          {activeTab === 'institutional' && (
            <InstitutionalTab userProfile={userProfile} />
          )}
        </main>

      </div>

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Modals */}
      {selectedExamToTranslate && (
        <TranslateExamModal
          exam={selectedExamToTranslate}
          onClose={() => setSelectedExamToTranslate(null)}
        />
      )}

      {isShareModalOpen && (
        <ShareModal
          userProfile={userProfile}
          exams={exams}
          medicalRecords={medicalRecords}
          medications={medications}
          allergies={allergies}
          vaccines={vaccines}
          metrics={metrics}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {isAddRecordModalOpen && (
        <AddRecordModal
          onClose={() => setIsAddRecordModalOpen(false)}
          onAddExam={handleAddExam}
          onAddMetric={handleAddMetric}
          onAddMedication={handleAddMedication}
          onAddRecord={handleAddRecord}
          onAddVaccine={handleAddVaccine}
          onAddAllergy={handleAddAllergy}
        />
      )}

    </div>
  );
}
