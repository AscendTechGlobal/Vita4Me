/**
 * Notification Manager for Medication Reminders using the Web Notifications API
 * and Web Audio API for gentle acoustic alerts.
 */

import { Medication } from '../types';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NextDoseInfo {
  medication: Medication;
  time: string;
  isToday: boolean;
  minutesRemaining: number;
  formattedTimeRemaining: string;
}

export interface MedicationAlertLog {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  time: string;
  timestamp: string;
  taken: boolean;
}

const STORAGE_KEYS = {
  NOTIFICATIONS_ENABLED: 'healthai_notifications_enabled',
  SOUND_ENABLED: 'healthai_sound_enabled',
  FIRED_ALERTS: 'healthai_fired_alerts_today',
  ALERT_HISTORY: 'healthai_alert_history',
};

/**
 * Check if the Web Notifications API is supported in the current environment
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current browser notification permission status
 */
export const getNotificationPermission = (): NotificationPermissionState => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
    return permission as NotificationPermissionState;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Notification.permission as NotificationPermissionState;
  }
};

/**
 * Check whether medication notifications are enabled by the user in the app settings
 */
export const areNotificationsEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
  return stored === null ? true : stored === 'true';
};

export const setNotificationsEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(enabled));
};

/**
 * Check whether sound alerts are enabled
 */
export const isSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
  return stored === null ? true : stored === 'true';
};

export const setSoundEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
};

/**
 * Play a gentle medical chime using Web Audio API
 */
export const playMedicationChime = (): void => {
  if (!isSoundEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic chords (E5, G#5, B5, E6) for a soft, pleasant reminder chime
    const notes = [659.25, 830.61, 987.77, 1318.51];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.12);

      gain.gain.setValueAtTime(0, now + index * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + index * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.85);
    });
  } catch (err) {
    console.warn('Web Audio playback failed or blocked:', err);
  }
};

/**
 * Get Alert History from localStorage
 */
export const getAlertHistory = (): MedicationAlertLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERT_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Add an alert to the in-app history log
 */
export const logAlertTriggered = (log: Omit<MedicationAlertLog, 'id' | 'timestamp'>): MedicationAlertLog => {
  const newLog: MedicationAlertLog = {
    ...log,
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };

  try {
    const history = getAlertHistory();
    const updated = [newLog, ...history].slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save alert to localStorage', err);
  }

  return newLog;
};

/**
 * Mark an alert as taken in history
 */
export const markAlertAsTaken = (alertId: string): void => {
  try {
    const history = getAlertHistory();
    const updated = history.map((item) => (item.id === alertId ? { ...item, taken: true } : item));
    localStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not update alert status', err);
  }
};

/**
 * Send a web notification for a medication
 */
export interface SendNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  medication?: Medication;
  time?: string;
  onClick?: () => void;
}

export const sendMedicationNotification = (options: SendNotificationOptions): boolean => {
  const { title, body, tag, medication, time, onClick } = options;

  // Play audio chime
  playMedicationChime();

  // Log in alert history
  if (medication && time) {
    logAlertTriggered({
      medicationId: medication.id,
      medicationName: medication.name,
      dosage: medication.dosage,
      time,
      taken: false,
    });
  }

  // Check if browser notifications are supported and allowed
  if (isNotificationSupported() && Notification.permission === 'granted' && areNotificationsEnabled()) {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: tag || `med-reminder-${Date.now()}`,
        requireInteraction: true,
        silent: !isSoundEnabled(),
      });

      notification.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notification.close();
      };

      return true;
    } catch (err) {
      console.warn('Browser Notification construction error:', err);
    }
  }

  return false;
};

/**
 * Trigger a test medication notification immediately
 */
export const triggerTestNotification = (medication?: Medication): boolean => {
  const medName = medication ? medication.name : 'Vitamina D3 2.000 UI';
  const dosage = medication ? medication.dosage : '1 cápsula (2000 UI)';
  const purpose = medication ? medication.purpose : 'Manutenção da Imunidade';

  return sendMedicationNotification({
    title: `⏰ Lembrete de Medicamento: ${medName}`,
    body: `Hora da dose (${dosage}). Finalidade: ${purpose}. Tomar com água.`,
    tag: 'test-med-alert',
    medication: medication || {
      id: 'test-med',
      name: medName,
      dosage,
      frequency: 'Diária',
      timesOfDay: ['Agora'],
      startDate: new Date().toISOString().split('T')[0],
      instructions: 'Tomar conforme prescrição médica',
      active: true,
      prescribedBy: 'Médico Assistente',
      purpose,
    },
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });
};

/**
 * Check if a specific alert was already fired today to avoid duplicates
 */
const getFiredAlertsForToday = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const todayKey = new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FIRED_ALERTS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey) {
      localStorage.removeItem(STORAGE_KEYS.FIRED_ALERTS);
      return new Set();
    }
    return new Set(parsed.keys || []);
  } catch {
    return new Set();
  }
};

const markAlertAsFiredToday = (key: string): void => {
  if (typeof window === 'undefined') return;
  const todayKey = new Date().toISOString().split('T')[0];
  const set = getFiredAlertsForToday();
  set.add(key);
  try {
    localStorage.setItem(
      STORAGE_KEYS.FIRED_ALERTS,
      JSON.stringify({
        date: todayKey,
        keys: Array.from(set),
      })
    );
  } catch (err) {
    console.warn('Error saving fired alerts', err);
  }
};

/**
 * Main checking function: verifies current local time against active medications
 * and fires Web Notification if it is time.
 */
export const checkScheduledMedications = (
  medications: Medication[],
  onInAppTrigger?: (med: Medication, time: string) => void
): void => {
  if (!areNotificationsEnabled()) return;

  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  const todayStr = now.toISOString().split('T')[0];

  const firedSet = getFiredAlertsForToday();
  const activeMeds = medications.filter((m) => m.active);

  activeMeds.forEach((med) => {
    med.timesOfDay.forEach((timeStr) => {
      // Standardize time string HH:MM
      const formattedTime = timeStr.trim().padStart(5, '0');

      if (formattedTime === currentTimeStr) {
        const alertUniqueKey = `${todayStr}_${med.id}_${formattedTime}`;

        if (!firedSet.has(alertUniqueKey)) {
          markAlertAsFiredToday(alertUniqueKey);

          // Dispatch Notification
          sendMedicationNotification({
            title: `💊 Hora do Medicamento: ${med.name}`,
            body: `Dose: ${med.dosage} (${med.frequency}). Instrução: ${med.instructions}`,
            tag: `med-${med.id}-${formattedTime}`,
            medication: med,
            time: formattedTime,
          });

          // Callback for in-app floating banner / modal
          if (onInAppTrigger) {
            onInAppTrigger(med, formattedTime);
          }
        }
      }
    });
  });
};

/**
 * Calculate the next upcoming dose across all active medications
 */
export const calculateNextDose = (medications: Medication[]): NextDoseInfo | null => {
  const activeMeds = medications.filter((m) => m.active && m.timesOfDay.length > 0);
  if (activeMeds.length === 0) return null;

  const now = new Date();
  const currentMinutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

  interface Candidate {
    medication: Medication;
    time: string;
    isToday: boolean;
    minutesUntil: number;
  }

  const candidates: Candidate[] = [];

  activeMeds.forEach((med) => {
    med.timesOfDay.forEach((timeStr) => {
      const parts = timeStr.split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const doseMinutesSinceMidnight = parts[0] * 60 + parts[1];

        if (doseMinutesSinceMidnight > currentMinutesSinceMidnight) {
          // Later today
          candidates.push({
            medication: med,
            time: timeStr,
            isToday: true,
            minutesUntil: doseMinutesSinceMidnight - currentMinutesSinceMidnight,
          });
        } else {
          // Tomorrow
          const minutesUntilTomorrow = 24 * 60 - currentMinutesSinceMidnight + doseMinutesSinceMidnight;
          candidates.push({
            medication: med,
            time: timeStr,
            isToday: false,
            minutesUntil: minutesUntilTomorrow,
          });
        }
      }
    });
  });

  if (candidates.length === 0) return null;

  // Sort by minutes until dose
  candidates.sort((a, b) => a.minutesUntil - b.minutesUntil);
  const next = candidates[0];

  const hours = Math.floor(next.minutesUntil / 60);
  const mins = next.minutesUntil % 60;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  } else {
    formatted = `${mins} min`;
  }

  return {
    medication: next.medication,
    time: next.time,
    isToday: next.isToday,
    minutesRemaining: next.minutesUntil,
    formattedTimeRemaining: formatted,
  };
};
