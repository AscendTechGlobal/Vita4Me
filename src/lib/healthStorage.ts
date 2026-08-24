import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from '../types';
import { 
  INITIAL_EXAMS, 
  INITIAL_INDICATORS, 
  INITIAL_MEDICATIONS, 
  INITIAL_RECORDS, 
  INITIAL_FAMILY_MEMBERS, 
  INITIAL_HABIT 
} from '../data/initialHealthData';

const KEYS = {
  EXAMS: 'healthai_exams_v1',
  INDICATORS: 'healthai_indicators_v1',
  MEDICATIONS: 'healthai_medications_v1',
  RECORDS: 'healthai_records_v1',
  FAMILY: 'healthai_family_v1',
  HABIT: 'healthai_habit_today_v1',
  ACTIVE_MEMBER: 'healthai_active_member_id_v1',
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Error reading ${key}:`, err);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key}:`, err);
  }
}

// 1. EXAMS
export function getExams(): LabExam[] {
  return getStored<LabExam[]>(KEYS.EXAMS, INITIAL_EXAMS);
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
  return exam;
}

export function deleteExam(id: string): void {
  const list = getExams().filter(e => e.id !== id);
  setStored(KEYS.EXAMS, list);
}

// 2. INDICATORS
export function getIndicators(): HealthIndicator[] {
  return getStored<HealthIndicator[]>(KEYS.INDICATORS, INITIAL_INDICATORS);
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
  return indicator;
}

export function deleteIndicator(id: string): void {
  const list = getIndicators().filter(i => i.id !== id);
  setStored(KEYS.INDICATORS, list);
}

// 3. MEDICATIONS
export function getMedications(): Medication[] {
  return getStored<Medication[]>(KEYS.MEDICATIONS, INITIAL_MEDICATIONS);
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
  return med;
}

export function deleteMedication(id: string): void {
  const list = getMedications().filter(m => m.id !== id);
  setStored(KEYS.MEDICATIONS, list);
}

// 4. HEALTH RECORDS (TIMELINE)
export function getHealthRecords(): HealthRecord[] {
  return getStored<HealthRecord[]>(KEYS.RECORDS, INITIAL_RECORDS);
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
  return record;
}

export function deleteHealthRecord(id: string): void {
  const list = getHealthRecords().filter(r => r.id !== id);
  setStored(KEYS.RECORDS, list);
}

// 5. FAMILY MEMBERS
export function getFamilyMembers(): FamilyMember[] {
  return getStored<FamilyMember[]>(KEYS.FAMILY, INITIAL_FAMILY_MEMBERS);
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
  return member;
}

export function deleteFamilyMember(id: string): void {
  const list = getFamilyMembers().filter(f => f.id !== id);
  setStored(KEYS.FAMILY, list);
}

export function getActiveFamilyMemberId(): string {
  return getStored<string>(KEYS.ACTIVE_MEMBER, 'fam-me');
}

export function setActiveFamilyMemberId(id: string): void {
  setStored(KEYS.ACTIVE_MEMBER, id);
}

// 6. DAILY HABIT
export function getTodayHabit(): DailyHabit {
  const todayStr = new Date().toISOString().split('T')[0];
  const habit = getStored<DailyHabit>(KEYS.HABIT, INITIAL_HABIT);
  if (habit.log_date !== todayStr) {
    const newDay: DailyHabit = {
      user_id: 'usr-default',
      log_date: todayStr,
      water_ml: 0,
      sleep_hours: 0,
      exercise_minutes: 0,
      mood: 'Neutro',
    };
    setStored(KEYS.HABIT, newDay);
    return newDay;
  }
  return habit;
}

export function saveDailyHabit(habit: Partial<DailyHabit>): DailyHabit {
  const current = getTodayHabit();
  const updated = { ...current, ...habit };
  setStored(KEYS.HABIT, updated);
  return updated;
}
