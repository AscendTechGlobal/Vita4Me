import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const KEYS = {
  EXAMS: 'vita4me_exams_v2',
  INDICATORS: 'vita4me_indicators_v2',
  MEDICATIONS: 'vita4me_medications_v2',
  RECORDS: 'vita4me_records_v2',
  FAMILY: 'vita4me_family_v2',
  HABIT: 'vita4me_habit_today_v2',
  ACTIVE_MEMBER: 'vita4me_active_member_id_v2',
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Erro ao ler ${key}:`, err);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao salvar ${key}:`, err);
  }
}

// 1. EXAMES (Retorna array vazio se não houver exames cadastrados)
export function getExams(): LabExam[] {
  return getStored<LabExam[]>(KEYS.EXAMS, []);
}

export function saveExam(exam: LabExam): LabExam {
  const list = getExams();
  const index = list.findIndex(e => e.id === exam.id);
  if (index >= 0) {
    list[index] = exam;
  } else {
    list.unshift(exam);
  }
  setStored(KEYS.EXAMS, list);

  // Sync assíncrono com Supabase se configurado
  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const payload = {
          user_id: user.id,
          family_member_id: exam.family_member_id || null,
          title: exam.title,
          category: exam.category,
          exam_date: exam.exam_date || new Date().toISOString().split('T')[0],
          laboratory: exam.laboratory || null,
          doctor_name: exam.doctor_name || null,
          file_url: exam.file_url || null,
          raw_text: exam.raw_text || null,
          ai_summary: exam.ai_summary || null,
          ai_simple_translation: exam.ai_simple_translation || null,
          ai_key_findings: exam.ai_key_findings || [],
          status: exam.status,
          updated_at: new Date().toISOString(),
        };

        const isLocalId = !exam.id || exam.id.startsWith('exam-');
        if (isLocalId) {
          supabase.from('lab_exams').insert(payload).then(({ error }) => {
            if (error) console.error('Erro ao inserir exame no Supabase:', error.message);
          });
        } else {
          supabase.from('lab_exams').update(payload).eq('id', exam.id).eq('user_id', user.id).then(({ error }) => {
            if (error) console.error('Erro ao atualizar exame no Supabase:', error.message);
          });
        }
      }
    });
  }

  return exam;
}

export function deleteExam(id: string): void {
  const list = getExams().filter(e => e.id !== id);
  setStored(KEYS.EXAMS, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('lab_exams').delete().eq('id', id).eq('user_id', user.id);
      }
    });
  }
}

// 2. INDICADORES (Retorna array vazio se não houver indicadores)
export function getIndicators(): HealthIndicator[] {
  return getStored<HealthIndicator[]>(KEYS.INDICATORS, []);
}

export function saveIndicator(indicator: HealthIndicator): HealthIndicator {
  const list = getIndicators();
  const index = list.findIndex(i => i.id === indicator.id);
  if (index >= 0) {
    list[index] = indicator;
  } else {
    list.unshift(indicator);
  }
  setStored(KEYS.INDICATORS, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const payload = {
          user_id: user.id,
          name: indicator.name,
          category: indicator.category,
          value: indicator.value,
          unit: indicator.unit,
          reference_min: indicator.reference_min ?? null,
          reference_max: indicator.reference_max ?? null,
          measured_at: indicator.measured_at || new Date().toISOString(),
          status: indicator.status === 'normal' ? 'normal' : 'alerta',
        };

        const isLocalId = !indicator.id || indicator.id.startsWith('ind-');
        if (isLocalId) {
          supabase.from('health_indicators').insert(payload).then(({ error }) => {
            if (error) console.error('Erro ao inserir indicador no Supabase:', error.message);
          });
        } else {
          supabase.from('health_indicators').update(payload).eq('id', indicator.id).eq('user_id', user.id).then(({ error }) => {
            if (error) console.error('Erro ao atualizar indicador no Supabase:', error.message);
          });
        }
      }
    });
  }

  return indicator;
}

export function deleteIndicator(id: string): void {
  const list = getIndicators().filter(i => i.id !== id);
  setStored(KEYS.INDICATORS, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('health_indicators').delete().eq('id', id).eq('user_id', user.id);
      }
    });
  }
}

// 3. MEDICAMENTOS (Retorna array vazio por padrão)
export function getMedications(): Medication[] {
  return getStored<Medication[]>(KEYS.MEDICATIONS, []);
}

export function saveMedication(med: Medication): Medication {
  const list = getMedications();
  const index = list.findIndex(m => m.id === med.id);
  if (index >= 0) {
    list[index] = med;
  } else {
    list.unshift(med);
  }
  setStored(KEYS.MEDICATIONS, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const payload = {
          user_id: user.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          schedule_times: med.schedule_times || [],
          instructions: med.instructions || null,
          prescribed_by: med.prescribed_by || null,
          is_continuous: med.is_continuous ?? true,
          is_active: med.is_active ?? true,
          updated_at: new Date().toISOString(),
        };

        const isLocalId = !med.id || med.id.startsWith('med-');
        if (isLocalId) {
          supabase.from('medications').insert(payload).then(({ error }) => {
            if (error) console.error('Erro ao inserir medicamento no Supabase:', error.message);
          });
        } else {
          supabase.from('medications').update(payload).eq('id', med.id).eq('user_id', user.id).then(({ error }) => {
            if (error) console.error('Erro ao atualizar medicamento no Supabase:', error.message);
          });
        }
      }
    });
  }

  return med;
}

export function deleteMedication(id: string): void {
  const list = getMedications().filter(m => m.id !== id);
  setStored(KEYS.MEDICATIONS, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('medications').delete().eq('id', id).eq('user_id', user.id);
      }
    });
  }
}

// 4. HISTÓRICO CLÍNICO / TIMELINE (Retorna array vazio por padrão)
export function getHealthRecords(): HealthRecord[] {
  return getStored<HealthRecord[]>(KEYS.RECORDS, []);
}

export function saveHealthRecord(record: HealthRecord): HealthRecord {
  const list = getHealthRecords();
  const index = list.findIndex(r => r.id === record.id);
  if (index >= 0) {
    list[index] = record;
  } else {
    list.unshift(record);
  }
  setStored(KEYS.RECORDS, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const payload = {
          user_id: user.id,
          record_type: record.record_type,
          title: record.title,
          description: record.description || null,
          doctor_or_institution: record.doctor_or_institution || null,
          event_date: record.event_date || new Date().toISOString().split('T')[0],
          tags: record.tags || [],
          updated_at: new Date().toISOString(),
        };

        const isLocalId = !record.id || record.id.startsWith('rec-');
        if (isLocalId) {
          supabase.from('health_records').insert(payload).then(({ error }) => {
            if (error) console.error('Erro ao inserir registro clínico no Supabase:', error.message);
          });
        } else {
          supabase.from('health_records').update(payload).eq('id', record.id).eq('user_id', user.id).then(({ error }) => {
            if (error) console.error('Erro ao atualizar registro clínico no Supabase:', error.message);
          });
        }
      }
    });
  }

  return record;
}

export function deleteHealthRecord(id: string): void {
  const list = getHealthRecords().filter(r => r.id !== id);
  setStored(KEYS.RECORDS, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('health_records').delete().eq('id', id).eq('user_id', user.id);
      }
    });
  }
}

// 5. PERFIS FAMILIARES (Retorna array vazio por padrão)
export function getFamilyMembers(): FamilyMember[] {
  return getStored<FamilyMember[]>(KEYS.FAMILY, []);
}

export function saveFamilyMember(member: FamilyMember): FamilyMember {
  const list = getFamilyMembers();
  const index = list.findIndex(f => f.id === member.id);
  if (index >= 0) {
    list[index] = member;
  } else {
    list.push(member);
  }
  setStored(KEYS.FAMILY, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('family_members').upsert({
          id: member.id.startsWith('fam-') ? undefined : member.id,
          user_id: user.id,
          name: member.name,
          relationship: member.relationship,
          date_of_birth: member.date_of_birth,
          gender: member.gender,
          blood_type: member.blood_type,
          height_cm: member.height_cm,
          weight_kg: member.weight_kg,
          smoking_status: member.smoking_status,
          alcohol_status: member.alcohol_status,
          activity_level: member.activity_level,
          chronic_conditions: member.chronic_conditions,
          allergies: member.allergies,
          is_active: member.is_active,
          onboarding_completed: member.onboarding_completed,
          updated_at: new Date().toISOString(),
        }).then(({ error }) => {
          if (error) console.error('Erro ao sincronizar membro familiar:', error);
        });
      }
    });
  }

  return member;
}

export function deleteFamilyMember(id: string): void {
  const list = getFamilyMembers().filter(f => f.id !== id);
  setStored(KEYS.FAMILY, list);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('family_members').delete().eq('id', id).eq('user_id', user.id);
      }
    });
  }
}

export function getActiveFamilyMemberId(): string {
  return getStored<string>(KEYS.ACTIVE_MEMBER, 'fam-me');
}

export function setActiveFamilyMemberId(id: string): void {
  setStored(KEYS.ACTIVE_MEMBER, id);
}

// 6. ROTINA DIÁRIA (Valores zerados por padrão)
export function getTodayHabit(): DailyHabit {
  const todayStr = new Date().toISOString().split('T')[0];
  const emptyHabit: DailyHabit = {
    user_id: 'usr-current',
    log_date: todayStr,
    water_ml: 0,
    sleep_hours: 0,
    exercise_minutes: 0,
    mood: 'Neutro',
  };
  const habit = getStored<DailyHabit>(KEYS.HABIT, emptyHabit);
  if (habit.log_date !== todayStr) {
    setStored(KEYS.HABIT, emptyHabit);
    return emptyHabit;
  }
  return habit;
}

export function saveDailyHabit(habit: Partial<DailyHabit>): DailyHabit {
  const current = getTodayHabit();
  const updated = { ...current, ...habit };
  setStored(KEYS.HABIT, updated);

  if (isSupabaseConfigured) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('daily_habits').upsert({
          user_id: user.id,
          log_date: updated.log_date,
          water_ml: updated.water_ml,
          sleep_hours: updated.sleep_hours,
          exercise_minutes: updated.exercise_minutes,
          mood: updated.mood,
          notes: updated.notes,
        }, { onConflict: 'user_id,log_date' });
      }
    });
  }

  return updated;
}
