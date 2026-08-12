export type HealthPlan = 'Free' | 'Plus' | 'Family' | 'Professional';

export interface UserProfile {
  name: string;
  email: string;
  age: number;
  gender: string;
  bloodType: string;
  heightCm: number;
  weightKg: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  plan: HealthPlan;
  cpf: string;
}

export type ExamCategory = 'Laboratorial' | 'Imagem' | 'Cardiologia' | 'Endocrinologia' | 'Outro';

export interface ExamValue {
  name: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'Atenção' | 'Alterado';
}

export interface Exam {
  id: string;
  title: string;
  category: ExamCategory;
  specialty: string;
  date: string;
  doctorName: string;
  laboratory: string;
  statusAlert: 'Normal' | 'Atenção' | 'Alterado';
  values: ExamValue[];
  summary: string;
  translatedExplanation?: string;
  fileUrl?: string;
  fileName?: string;
}

export type MedicalRecordType = 'Consulta' | 'Cirurgia' | 'Internação' | 'Diagnóstico' | 'Exame' | 'Vacina' | 'Procedimento';

export interface MedicalRecord {
  id: string;
  date: string;
  type: MedicalRecordType;
  title: string;
  doctorName: string;
  specialty: string;
  facility: string;
  notes: string;
  diagnosis?: string;
  prescriptionSummary?: string;
  tags: string[];
}

export type MetricType = 
  | 'glicemia' 
  | 'pressao_arterial' 
  | 'peso' 
  | 'colesterol_total' 
  | 'colesterol_hdl' 
  | 'colesterol_ldl' 
  | 'vitamina_d' 
  | 'frequencia_cardiaca' 
  | 'ferritina' 
  | 'tsh' 
  | 'hemoglobina';

export interface MetricEntry {
  id: string;
  date: string; // YYYY-MM-DD or YYYY-MM
  type: MetricType;
  value: number;
  valueSecondary?: number; // e.g., diastolic pressure
  unit: string;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timesOfDay: string[];
  startDate: string;
  endDate?: string;
  instructions: string;
  active: boolean;
  prescribedBy: string;
  purpose: string;
}

export interface Vaccine {
  id: string;
  name: string;
  doseInfo: string;
  dateAdministered?: string;
  dueDate?: string;
  status: 'Em dia' | 'Pendente' | 'Agendada';
  location?: string;
  batchNumber?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  category: 'Alimentar' | 'Medicamentosa' | 'Ambiental' | 'Outra';
  severity: 'Leve' | 'Moderada' | 'Grave';
  reaction: string;
  diagnosedDate?: string;
}

export interface Procedure {
  id: string;
  title: string;
  type: 'Procedimento' | 'Cirurgia';
  date: string;
  doctorName: string;
  hospital: string;
  outcome: string;
  notes?: string;
}

export interface DailyHabits {
  date: string; // YYYY-MM-DD
  waterIntakeMl: number;
  waterGoalMl: number;
  sleepHours: number;
  sleepQuality: 'Péssima' | 'Regular' | 'Boa' | 'Excelente';
  mood: 'Ótimo' | 'Bem' | 'Neutro' | 'Cansado' | 'Estressado';
  physicalActivityMins: number;
  activityType?: string;
  bodyWeightKg?: number;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'Receita' | 'Atestado' | 'Laudo' | 'Comprovante' | 'Carteira' | 'Outro';
  uploadDate: string;
  doctorName?: string;
  fileSize: string;
  notes?: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  groundingSources?: string[];
}
