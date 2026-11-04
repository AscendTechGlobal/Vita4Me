import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

// Chaves legadas que NUNCA devem permanecer no localStorage/sessionStorage (Remediação A01)
const LEGACY_CLINICAL_KEYS = [
  'vita4me_current_user_id_v2',
  'vita4me_exams_v2',
  'vita4me_indicators_v2',
  'vita4me_medications_v2',
  'vita4me_records_v2',
  'vita4me_family_v2',
  'vita4me_habit_today_v2',
  'vita4me_active_member_id_v2',
];

interface ClinicalMemoryState {
  userId: string | null;
  exams: LabExam[];
  indicators: HealthIndicator[];
  medications: Medication[];
  records: HealthRecord[];
  familyMembers: FamilyMember[];
  todayHabit: DailyHabit | null;
  activeFamilyMemberId: string;
}

const createEmptyState = (userId: string | null = null): ClinicalMemoryState => ({
  userId,
  exams: [],
  indicators: [],
  medications: [],
  records: [],
  familyMembers: [],
  todayHabit: null,
  activeFamilyMemberId: 'fam-me',
});

// Armazenamento estritamente em memória RAM (volátil por aba/sessão de execução)
let memoryStore: ClinicalMemoryState = createEmptyState(null);

/**
 * Remove proativamente qualquer resquício de dado clínico legado em localStorage/sessionStorage.
 * Preserva exclusivamente preferências visuais não sensíveis (tema e idioma).
 */
export function purgeLegacyClinicalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_CLINICAL_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignorar erros de storage bloqueado pelo navegador
  }
}

// Executa expurgo imediato ao carregar o módulo
purgeLegacyClinicalStorage();

export function clearAllHealthStorage(): void {
  memoryStore = createEmptyState(null);
  purgeLegacyClinicalStorage();
}

export function ensureStorageUserScope(userId: string | null): void {
  purgeLegacyClinicalStorage();
  if (!userId) {
    memoryStore = createEmptyState(null);
    return;
  }
  if (memoryStore.userId !== userId) {
    memoryStore = createEmptyState(userId);
  }
}

function isUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireAuthenticatedUser(): Promise<{ id: string }> {
  if (!isSupabaseConfigured) {
    throw new Error('Serviço de banco de dados não configurado.');
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    clearAllHealthStorage();
    throw new Error('Sessão expirada ou usuário não autenticado. Faça login novamente.');
  }
  ensureStorageUserScope(user.id);
  return user;
}

/**
 * Valida se o family_member_id pertence ao próprio usuário autenticado antes de enviar ao banco.
 */
async function resolveOwnedFamilyMemberId(
  userId: string,
  familyMemberId?: string | null
): Promise<string | null> {
  if (!familyMemberId || familyMemberId === 'fam-me') {
    return null;
  }
  if (!isUuid(familyMemberId)) {
    throw new Error('Identificador de perfil familiar inválido.');
  }
  // Verificar na memória se já hidratado
  const ownedInMemory = memoryStore.familyMembers.some(
    (fm) => fm.id === familyMemberId && (!fm.user_id || fm.user_id === userId)
  );
  if (ownedInMemory) {
    return familyMemberId;
  }
  // Confirmar no Supabase com filtro estrito por user_id
  const { data, error } = await supabase
    .from('family_members')
    .select('id')
    .eq('id', familyMemberId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Acesso negado: perfil familiar não pertence ao usuário autenticado.');
  }
  return data.id;
}

// ============================================================================
// MAPEuladores DE CONTRATO (BANCO <-> FRONTEND)
// ============================================================================

function mapDbExamToLabExam(row: any): LabExam {
  const rawStatus = String(row.status || row.status_alert || 'normal').toLowerCase();
  const status: 'normal' | 'warning' | 'error' =
    rawStatus === 'error' || rawStatus.includes('alerta') || rawStatus.includes('crític')
      ? 'error'
      : rawStatus === 'warning' || rawStatus.includes('aten')
      ? 'warning'
      : 'normal';

  return {
    id: row.id,
    user_id: row.user_id,
    family_member_id: row.family_member_id || undefined,
    title: row.title || 'Exame Laboratorial',
    category: row.category || 'Laboratorial',
    exam_date: row.exam_date || new Date().toISOString().split('T')[0],
    laboratory: row.laboratory || undefined,
    doctor_name: row.doctor_name || undefined,
    file_url: row.file_url || undefined,
    raw_text: row.raw_text || undefined,
    ai_summary: row.ai_summary || '',
    ai_simple_translation: row.ai_simple_translation || '',
    ai_key_findings: Array.isArray(row.ai_key_findings) ? row.ai_key_findings : [],
    ai_questions_for_doctor: Array.isArray(row.ai_questions_for_doctor) ? row.ai_questions_for_doctor : [],
    status,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapDbIndicatorToHealthIndicator(row: any): HealthIndicator {
  const rawStatus = String(row.status || 'normal').toLowerCase();
  const validStatuses = ['low', 'normal', 'borderline', 'high', 'critical'] as const;
  const status = (validStatuses as readonly string[]).includes(rawStatus)
    ? (rawStatus as HealthIndicator['status'])
    : rawStatus === 'alerta'
    ? 'high'
    : 'normal';

  return {
    id: row.id,
    user_id: row.user_id,
    family_member_id: row.family_member_id || undefined,
    name: row.name,
    category: row.category || 'Geral',
    value: Number(row.value),
    unit: row.unit || '',
    reference_min: row.reference_min !== null && row.reference_min !== undefined ? Number(row.reference_min) : undefined,
    reference_max: row.reference_max !== null && row.reference_max !== undefined ? Number(row.reference_max) : undefined,
    measured_at: row.measured_at || row.created_at || new Date().toISOString(),
    status,
    notes: row.notes || undefined,
    created_at: row.created_at,
  };
}

function mapDbMedicationToMedication(row: any): Medication {
  return {
    id: row.id,
    user_id: row.user_id,
    family_member_id: row.family_member_id || undefined,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
    schedule_times: Array.isArray(row.schedule_times) ? row.schedule_times : [],
    instructions: row.instructions || undefined,
    prescribed_by: row.prescribed_by || undefined,
    start_date: row.start_date || undefined,
    end_date: row.end_date || undefined,
    is_continuous: Boolean(row.is_continuous),
    is_active: row.is_active !== false,
    created_at: row.created_at,
  };
}

function mapDbRecordToHealthRecord(row: any): HealthRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    family_member_id: row.family_member_id || undefined,
    record_type: row.record_type || 'consulta',
    title: row.title,
    description: row.description || '',
    doctor_or_institution: row.doctor_or_institution || row.doctor_name || row.facility_name || '',
    event_date: row.event_date || new Date().toISOString().split('T')[0],
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at,
  };
}

function mapDbFamilyToFamilyMember(row: any): FamilyMember {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    relationship: row.relationship || 'Outro',
    date_of_birth: row.date_of_birth || '',
    gender: row.gender || undefined,
    blood_type: row.blood_type || undefined,
    height_cm: row.height_cm !== null && row.height_cm !== undefined ? Number(row.height_cm) : undefined,
    weight_kg: row.weight_kg !== null && row.weight_kg !== undefined ? Number(row.weight_kg) : undefined,
    smoking_status: row.smoking_status || undefined,
    alcohol_status: row.alcohol_status || undefined,
    activity_level: row.activity_level || undefined,
    chronic_conditions: Array.isArray(row.chronic_conditions) ? row.chronic_conditions : [],
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    is_active: row.is_active !== false,
    onboarding_completed: row.onboarding_completed !== false,
    created_at: row.created_at || new Date().toISOString(),
  };
}

// ============================================================================
// 1. EXAMES LABORATORIAIS (A07 — Persistência Confirmada pelo Banco)
// ============================================================================
export function getExams(): LabExam[] {
  if (!memoryStore.userId) return [];
  return [...memoryStore.exams];
}

export async function saveExam(exam: LabExam): Promise<LabExam> {
  const user = await requireAuthenticatedUser();
  const familyMemberId = await resolveOwnedFamilyMemberId(user.id, exam.family_member_id);

  const statusAlert =
    exam.status === 'error'
      ? 'Alerta'
      : exam.status === 'warning'
      ? 'Atenção'
      : 'Normal';

  const payload = {
    user_id: user.id,
    family_member_id: familyMemberId,
    title: exam.title.trim(),
    category: exam.category || 'Laboratorial',
    exam_date: exam.exam_date || new Date().toISOString().split('T')[0],
    laboratory: exam.laboratory?.trim() || null,
    doctor_name: exam.doctor_name?.trim() || null,
    file_url: exam.file_url || null,
    raw_text: exam.raw_text || null,
    ai_summary: exam.ai_summary || null,
    ai_simple_translation: exam.ai_simple_translation || null,
    ai_key_findings: Array.isArray(exam.ai_key_findings) ? exam.ai_key_findings : [],
    ai_questions_for_doctor: Array.isArray(exam.ai_questions_for_doctor) ? exam.ai_questions_for_doctor : [],
    status_alert: statusAlert,
    updated_at: new Date().toISOString(),
  };

  const isExistingDbRow = isUuid(exam.id) && memoryStore.exams.some((e) => e.id === exam.id);

  if (!isExistingDbRow) {
    // Se já veio com UUID válido do endpoint de IA (/api/ai/analyze-exam-document), verificar se já existe no banco
    if (isUuid(exam.id)) {
      const { data: existingRow } = await supabase
        .from('lab_exams')
        .select('*')
        .eq('id', exam.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRow) {
        const { data: updatedRow, error: updateErr } = await supabase
          .from('lab_exams')
          .update(payload)
          .eq('id', exam.id)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (updateErr || !updatedRow) {
          throw new Error(updateErr?.message || 'Não foi possível salvar as alterações do exame no servidor.');
        }

        const mapped = mapDbExamToLabExam(updatedRow);
        const idx = memoryStore.exams.findIndex((e) => e.id === mapped.id);
        if (idx >= 0) {
          memoryStore.exams[idx] = mapped;
        } else {
          memoryStore.exams.unshift(mapped);
        }
        return mapped;
      }
    }

    const { data, error } = await supabase
      .from('lab_exams')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível salvar o exame no banco de dados.');
    }

    const saved = mapDbExamToLabExam(data);
    memoryStore.exams.unshift(saved);
    return saved;
  } else {
    const { data, error } = await supabase
      .from('lab_exams')
      .update(payload)
      .eq('id', exam.id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível atualizar o exame no banco de dados.');
    }

    const saved = mapDbExamToLabExam(data);
    const idx = memoryStore.exams.findIndex((e) => e.id === saved.id);
    if (idx >= 0) {
      memoryStore.exams[idx] = saved;
    } else {
      memoryStore.exams.unshift(saved);
    }
    return saved;
  }
}

export async function deleteExam(id: string): Promise<void> {
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from('lab_exams')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Não foi possível excluir o exame no servidor.');
  }

  memoryStore.exams = memoryStore.exams.filter((e) => e.id !== id);
}

// ============================================================================
// 2. INDICADORES CLÍNICOS
// ============================================================================
export function getIndicators(): HealthIndicator[] {
  if (!memoryStore.userId) return [];
  return [...memoryStore.indicators];
}

export async function saveIndicator(indicator: HealthIndicator): Promise<HealthIndicator> {
  const user = await requireAuthenticatedUser();
  const familyMemberId = await resolveOwnedFamilyMemberId(user.id, indicator.family_member_id);

  const validStatuses = ['low', 'normal', 'borderline', 'high', 'critical'];
  const statusVal = validStatuses.includes(indicator.status) ? indicator.status : 'normal';

  const payload = {
    user_id: user.id,
    family_member_id: familyMemberId,
    name: indicator.name.trim(),
    category: indicator.category || 'Geral',
    value: Number(indicator.value),
    unit: indicator.unit || '',
    reference_min: indicator.reference_min ?? null,
    reference_max: indicator.reference_max ?? null,
    measured_at: indicator.measured_at || new Date().toISOString(),
    status: statusVal,
    notes: indicator.notes || null,
  };

  const isExistingDbRow = isUuid(indicator.id) && memoryStore.indicators.some((i) => i.id === indicator.id);

  if (!isExistingDbRow) {
    const { data, error } = await supabase
      .from('health_indicators')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível registrar o indicador no banco de dados.');
    }

    const saved = mapDbIndicatorToHealthIndicator(data);
    memoryStore.indicators.unshift(saved);
    return saved;
  } else {
    const { data, error } = await supabase
      .from('health_indicators')
      .update(payload)
      .eq('id', indicator.id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível atualizar o indicador no banco de dados.');
    }

    const saved = mapDbIndicatorToHealthIndicator(data);
    const idx = memoryStore.indicators.findIndex((i) => i.id === saved.id);
    if (idx >= 0) {
      memoryStore.indicators[idx] = saved;
    } else {
      memoryStore.indicators.unshift(saved);
    }
    return saved;
  }
}

export async function deleteIndicator(id: string): Promise<void> {
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from('health_indicators')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Não foi possível excluir o indicador no servidor.');
  }

  memoryStore.indicators = memoryStore.indicators.filter((i) => i.id !== id);
}

// ============================================================================
// 3. MEDICAMENTOS
// ============================================================================
export function getMedications(): Medication[] {
  if (!memoryStore.userId) return [];
  return [...memoryStore.medications];
}

export async function saveMedication(med: Medication): Promise<Medication> {
  const user = await requireAuthenticatedUser();
  const familyMemberId = await resolveOwnedFamilyMemberId(user.id, med.family_member_id);

  const payload = {
    user_id: user.id,
    family_member_id: familyMemberId,
    name: med.name.trim(),
    dosage: med.dosage.trim(),
    frequency: med.frequency,
    schedule_times: Array.isArray(med.schedule_times) ? med.schedule_times : [],
    instructions: med.instructions?.trim() || null,
    prescribed_by: med.prescribed_by?.trim() || null,
    is_continuous: med.is_continuous ?? true,
    is_active: med.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  const isExistingDbRow = isUuid(med.id) && memoryStore.medications.some((m) => m.id === med.id);

  if (!isExistingDbRow) {
    const { data, error } = await supabase
      .from('medications')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível salvar o medicamento no banco de dados.');
    }

    const saved = mapDbMedicationToMedication(data);
    memoryStore.medications.unshift(saved);
    return saved;
  } else {
    const { data, error } = await supabase
      .from('medications')
      .update(payload)
      .eq('id', med.id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível atualizar o medicamento no banco de dados.');
    }

    const saved = mapDbMedicationToMedication(data);
    const idx = memoryStore.medications.findIndex((m) => m.id === saved.id);
    if (idx >= 0) {
      memoryStore.medications[idx] = saved;
    } else {
      memoryStore.medications.unshift(saved);
    }
    return saved;
  }
}

export async function deleteMedication(id: string): Promise<void> {
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Não foi possível excluir o medicamento no servidor.');
  }

  memoryStore.medications = memoryStore.medications.filter((m) => m.id !== id);
}

// ============================================================================
// 4. HISTÓRICO CLÍNICO / TIMELINE
// ============================================================================
export function getHealthRecords(): HealthRecord[] {
  if (!memoryStore.userId) return [];
  return [...memoryStore.records];
}

export async function saveHealthRecord(record: HealthRecord): Promise<HealthRecord> {
  const user = await requireAuthenticatedUser();
  const familyMemberId = await resolveOwnedFamilyMemberId(user.id, record.family_member_id);

  const docOrInst = record.doctor_or_institution?.trim() || null;

  const payload = {
    user_id: user.id,
    family_member_id: familyMemberId,
    record_type: record.record_type || 'consulta',
    title: record.title.trim(),
    description: record.description?.trim() || null,
    doctor_name: docOrInst,
    facility_name: docOrInst,
    event_date: record.event_date || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };

  const isExistingDbRow = isUuid(record.id) && memoryStore.records.some((r) => r.id === record.id);

  if (!isExistingDbRow) {
    const { data, error } = await supabase
      .from('health_records')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível salvar o registro clínico no banco de dados.');
    }

    const saved = mapDbRecordToHealthRecord(data);
    memoryStore.records.unshift(saved);
    return saved;
  } else {
    const { data, error } = await supabase
      .from('health_records')
      .update(payload)
      .eq('id', record.id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível atualizar o registro clínico no banco de dados.');
    }

    const saved = mapDbRecordToHealthRecord(data);
    const idx = memoryStore.records.findIndex((r) => r.id === saved.id);
    if (idx >= 0) {
      memoryStore.records[idx] = saved;
    } else {
      memoryStore.records.unshift(saved);
    }
    return saved;
  }
}

export async function deleteHealthRecord(id: string): Promise<void> {
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from('health_records')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Não foi possível excluir o registro clínico no servidor.');
  }

  memoryStore.records = memoryStore.records.filter((r) => r.id !== id);
}

// ============================================================================
// 5. PERFIS FAMILIARES
// ============================================================================
export function getFamilyMembers(): FamilyMember[] {
  if (!memoryStore.userId) return [];
  return [...memoryStore.familyMembers];
}

export async function saveFamilyMember(member: FamilyMember): Promise<FamilyMember> {
  const user = await requireAuthenticatedUser();

  const payload = {
    user_id: user.id,
    name: member.name.trim(),
    relationship: member.relationship || 'Outro',
    date_of_birth: member.date_of_birth || null,
    gender: member.gender || null,
    blood_type: member.blood_type || null,
    height_cm: member.height_cm ?? null,
    weight_kg: member.weight_kg ?? null,
    smoking_status: member.smoking_status || null,
    alcohol_status: member.alcohol_status || null,
    activity_level: member.activity_level || null,
    chronic_conditions: Array.isArray(member.chronic_conditions) ? member.chronic_conditions : [],
    allergies: Array.isArray(member.allergies) ? member.allergies : [],
    is_active: member.is_active ?? true,
    onboarding_completed: member.onboarding_completed ?? true,
    updated_at: new Date().toISOString(),
  };

  const isExistingDbRow = isUuid(member.id) && memoryStore.familyMembers.some((f) => f.id === member.id);

  if (!isExistingDbRow) {
    const { data, error } = await supabase
      .from('family_members')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível salvar o perfil familiar no servidor.');
    }

    const saved = mapDbFamilyToFamilyMember(data);
    memoryStore.familyMembers.push(saved);
    return saved;
  } else {
    const { data, error } = await supabase
      .from('family_members')
      .update(payload)
      .eq('id', member.id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível atualizar o perfil familiar no servidor.');
    }

    const saved = mapDbFamilyToFamilyMember(data);
    const idx = memoryStore.familyMembers.findIndex((f) => f.id === saved.id);
    if (idx >= 0) {
      memoryStore.familyMembers[idx] = saved;
    } else {
      memoryStore.familyMembers.push(saved);
    }
    return saved;
  }
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Não foi possível remover o perfil familiar no servidor.');
  }

  memoryStore.familyMembers = memoryStore.familyMembers.filter((f) => f.id !== id);
  if (memoryStore.activeFamilyMemberId === id) {
    memoryStore.activeFamilyMemberId = 'fam-me';
  }
}

export function getActiveFamilyMemberId(): string {
  return memoryStore.activeFamilyMemberId || 'fam-me';
}

export function setActiveFamilyMemberId(id: string): void {
  memoryStore.activeFamilyMemberId = id || 'fam-me';
}

// ============================================================================
// 6. ROTINA DIÁRIA
// ============================================================================
export function getTodayHabit(): DailyHabit {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentUserId = memoryStore.userId || 'usr-unauthenticated';

  if (
    memoryStore.todayHabit &&
    memoryStore.todayHabit.log_date === todayStr &&
    memoryStore.todayHabit.user_id === currentUserId
  ) {
    return { ...memoryStore.todayHabit };
  }

  const emptyHabit: DailyHabit = {
    user_id: currentUserId,
    log_date: todayStr,
    water_ml: 0,
    sleep_hours: 0,
    exercise_minutes: 0,
    mood: 'Neutro',
  };
  memoryStore.todayHabit = emptyHabit;
  return { ...emptyHabit };
}

export async function saveDailyHabit(habit: Partial<DailyHabit>): Promise<DailyHabit> {
  const user = await requireAuthenticatedUser();
  const current = getTodayHabit();
  const candidate: DailyHabit = {
    ...current,
    ...habit,
    user_id: user.id,
    log_date: habit.log_date || current.log_date,
  };

  const payload = {
    user_id: user.id,
    log_date: candidate.log_date,
    water_ml: Number(candidate.water_ml) || 0,
    sleep_hours: Number(candidate.sleep_hours) || 0,
    exercise_minutes: Number(candidate.exercise_minutes) || 0,
    mood: candidate.mood || 'Neutro',
    notes: candidate.notes || null,
  };

  // Verificar se já existe registro de hoje para este usuário
  const { data: existing } = await supabase
    .from('daily_habits')
    .select('id')
    .eq('user_id', user.id)
    .eq('log_date', candidate.log_date)
    .maybeSingle();

  let savedRow: any = null;
  if (existing?.id) {
    const { data, error } = await supabase
      .from('daily_habits')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível atualizar a rotina diária no servidor.');
    }
    savedRow = data;
  } else {
    const { data, error } = await supabase
      .from('daily_habits')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Não foi possível salvar a rotina diária no servidor.');
    }
    savedRow = data;
  }

  const confirmedHabit: DailyHabit = {
    id: savedRow.id,
    user_id: savedRow.user_id,
    log_date: savedRow.log_date,
    water_ml: Number(savedRow.water_ml) || 0,
    sleep_hours: Number(savedRow.sleep_hours) || 0,
    exercise_minutes: Number(savedRow.exercise_minutes) || 0,
    mood: savedRow.mood || 'Neutro',
    notes: savedRow.notes || undefined,
  };

  memoryStore.todayHabit = confirmedHabit;
  return { ...confirmedHabit };
}

// ============================================================================
// 7. SINCRONIZAÇÃO COMPLETA DO SUPABASE (Hidratação em Memória)
// ============================================================================
export async function syncAllFromSupabase(): Promise<boolean> {
  purgeLegacyClinicalStorage();
  if (!isSupabaseConfigured) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      clearAllHealthStorage();
      return false;
    }

    ensureStorageUserScope(user.id);

    const todayStr = new Date().toISOString().split('T')[0];

    const [famRes, examRes, indRes, medRes, recRes, habitRes] = await Promise.all([
      supabase.from('family_members').select('*').eq('user_id', user.id),
      supabase.from('lab_exams').select('*').eq('user_id', user.id).order('exam_date', { ascending: false }),
      supabase.from('health_indicators').select('*').eq('user_id', user.id).order('measured_at', { ascending: false }),
      supabase.from('medications').select('*').eq('user_id', user.id),
      supabase.from('health_records').select('*').eq('user_id', user.id).order('event_date', { ascending: false }),
      supabase.from('daily_habits').select('*').eq('user_id', user.id).eq('log_date', todayStr).maybeSingle(),
    ]);

    if (!famRes.error && famRes.data) {
      memoryStore.familyMembers = famRes.data.map(mapDbFamilyToFamilyMember);
    }
    if (!examRes.error && examRes.data) {
      memoryStore.exams = examRes.data.map(mapDbExamToLabExam);
    }
    if (!indRes.error && indRes.data) {
      memoryStore.indicators = indRes.data.map(mapDbIndicatorToHealthIndicator);
    }
    if (!medRes.error && medRes.data) {
      memoryStore.medications = medRes.data.map(mapDbMedicationToMedication);
    }
    if (!recRes.error && recRes.data) {
      memoryStore.records = recRes.data.map(mapDbRecordToHealthRecord);
    }
    if (!habitRes.error) {
      memoryStore.todayHabit = habitRes.data
        ? {
            id: habitRes.data.id,
            user_id: habitRes.data.user_id,
            log_date: habitRes.data.log_date,
            water_ml: Number(habitRes.data.water_ml) || 0,
            sleep_hours: Number(habitRes.data.sleep_hours) || 0,
            exercise_minutes: Number(habitRes.data.exercise_minutes) || 0,
            mood: habitRes.data.mood || 'Neutro',
            notes: habitRes.data.notes || undefined,
          }
        : {
            user_id: user.id,
            log_date: todayStr,
            water_ml: 0,
            sleep_hours: 0,
            exercise_minutes: 0,
            mood: 'Neutro',
          };
    }

    return true;
  } catch (err) {
    console.warn('Aviso na sincronização do Supabase:', err);
    return false;
  }
}
