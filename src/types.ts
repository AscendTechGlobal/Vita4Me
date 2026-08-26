// ==============================================================================
// HEALTH.AI — DEFINIÇÕES DE TIPOS TYPESCRIPT
// ==============================================================================

export type PlanTier = 'free' | 'individual' | 'family';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  date_of_birth?: string | null;
  blood_type?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  smoking_status?: 'Não fumante' | 'Ex-fumante' | 'Fumante ocasional' | 'Fumante diário' | null;
  alcohol_status?: 'Não consome' | 'Socialmente' | 'Moderado' | 'Frequente' | null;
  activity_level?: 'Sedentário' | 'Leve' | 'Moderado' | 'Intenso' | null;
  chronic_conditions?: string[];
  allergies?: string[];
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  plan_tier: PlanTier;
  subscription_status: SubscriptionStatus;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  ai_credits?: number;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  relationship: 'Titular' | 'Cônjuge' | 'Filho(a)' | 'Pai/Mãe' | 'Outro';
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  height_cm?: number;
  weight_kg?: number;
  smoking_status?: string;
  alcohol_status?: string;
  activity_level?: string;
  chronic_conditions?: string[];
  allergies: string[];
  is_active: boolean;
  onboarding_completed?: boolean;
  created_at: string;
}

export interface LabExam {
  id: string;
  user_id: string;
  family_member_id?: string | null;
  title: string;
  category: 'Laboratorial' | 'Imagem' | 'Cardiológico' | 'Genético' | 'Outro';
  exam_date: string;
  laboratory?: string;
  doctor_name?: string;
  file_url?: string;
  raw_text?: string;
  ai_summary?: string;
  ai_simple_translation?: string;
  ai_key_findings: Array<{
    parameter: string;
    value: string;
    status: 'normal' | 'altered' | 'attention';
    simpleExplanation: string;
  }>;
  status: 'pending' | 'processed' | 'error';
  created_at: string;
}

export interface HealthIndicator {
  id: string;
  user_id: string;
  family_member_id?: string | null;
  name: string;
  category: 'Metabólico' | 'Lipídico' | 'Vitaminas' | 'Hormonal' | 'Vital';
  value: number;
  unit: string;
  reference_min?: number;
  reference_max?: number;
  measured_at: string;
  status: 'low' | 'normal' | 'borderline' | 'high' | 'critical';
  created_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  family_member_id?: string | null;
  name: string;
  dosage: string;
  frequency: string;
  schedule_times: string[];
  instructions?: string;
  prescribed_by?: string;
  start_date?: string;
  end_date?: string;
  is_continuous: boolean;
  is_active: boolean;
  created_at: string;
}

export type RecordType = 'consulta' | 'vacina' | 'cirurgia' | 'internacao' | 'alergia' | 'procedimento';

export interface HealthRecord {
  id: string;
  user_id: string;
  family_member_id?: string | null;
  record_type: RecordType;
  title: string;
  description?: string;
  doctor_or_institution?: string;
  event_date: string;
  tags: string[];
  attachments?: Array<{ name: string; url: string }>;
  created_at: string;
}

export interface DailyHabit {
  id?: string;
  user_id: string;
  log_date: string;
  water_ml: number;
  sleep_hours: number;
  exercise_minutes: number;
  mood?: 'Excelente' | 'Bom' | 'Neutro' | 'Cansado' | 'Estressado';
  notes?: string;
}

export interface HealthAIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  references?: Array<{
    type: 'exam' | 'indicator' | 'record' | 'medication';
    title: string;
    date: string;
  }>;
}

export interface PricingPlan {
  id: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearlyMonthlyEquivalent: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  highlight?: boolean;
  badge?: string;
  subBadge?: string;
  ctaText: string;
  features: string[];
  aiQuotaDescription: string;
  storageDescription: string;
}

// ==============================================================================
// TYPE ALIASES & COMPATIBILITY LAYER
// ==============================================================================
export type Exam = LabExam;
export type ExamCategory = string;
export type MedicalRecord = HealthRecord;
export type MetricEntry = HealthIndicator;
export type MetricType = string;
export type DailyHabits = DailyHabit;
export type ChatMessage = HealthAIChatMessage;

export interface Vaccine {
  id: string;
  name: string;
  date: string;
  nextDose?: string;
  manufacturer?: string;
  notes?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: 'leve' | 'moderada' | 'grave';
  reaction: string;
}

export interface Procedure {
  id: string;
  name: string;
  date: string;
  doctor?: string;
  location?: string;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  date: string;
  doctorName?: string;
  fileUrl?: string;
  summary?: string;
}
