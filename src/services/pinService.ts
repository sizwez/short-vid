import { getDeviceId } from '../lib/deviceId';

const PIN_HASH_KEY = 'mzansi_pin_hash';
const PIN_SETUP_AT_KEY = 'mzansi_pin_setup_at';

export interface PinValidationResult {
  success: boolean;
  attemptsRemaining?: number;
  lockedUntil?: number;
}

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS_KEY = 'mzansi_pin_attempts';
const LOCKOUT_UNTIL_KEY = 'mzansi_pin_lockout_until';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_mzansi_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function setupPin(pin: string): Promise<{ success: boolean; error?: string }> {
  if (!pin || pin.length < 4 || pin.length > 6) {
    return { success: false, error: 'PIN must be 4-6 digits' };
  }
  
  if (!/^\d+$/.test(pin)) {
    return { success: false, error: 'PIN must contain only numbers' };
  }
  
  const deviceId = getDeviceId();
  const hash = await hashPin(pin);
  
  localStorage.setItem(`${PIN_HASH_KEY}_${deviceId}`, hash);
  localStorage.setItem(`${PIN_SETUP_AT_KEY}_${deviceId}`, Date.now().toString());
  localStorage.removeItem(`${MAX_ATTEMPTS_KEY}_${deviceId}`);
  localStorage.removeItem(`${LOCKOUT_UNTIL_KEY}_${deviceId}`);
  
  return { success: true };
}

export async function verifyPin(pin: string): Promise<PinValidationResult> {
  const deviceId = getDeviceId();
  const lockoutUntilStr = localStorage.getItem(`${LOCKOUT_UNTIL_KEY}_${deviceId}`);
  const lockoutUntil = lockoutUntilStr ? parseInt(lockoutUntilStr, 10) : 0;
  
  if (lockoutUntil > Date.now()) {
    return {
      success: false,
      attemptsRemaining: 0,
      lockedUntil: lockoutUntil
    };
  }
  
  const storedHash = localStorage.getItem(`${PIN_HASH_KEY}_${deviceId}`);
  if (!storedHash) {
    return { success: false };
  }
  
  const inputHash = await hashPin(pin);
  
  if (inputHash === storedHash) {
    localStorage.removeItem(`${MAX_ATTEMPTS_KEY}_${deviceId}`);
    localStorage.removeItem(`${LOCKOUT_UNTIL_KEY}_${deviceId}`);
    return { success: true };
  }
  
  const attemptsStr = localStorage.getItem(`${MAX_ATTEMPTS_KEY}_${deviceId}`);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
  const newAttempts = attempts + 1;
  
  if (newAttempts >= MAX_PIN_ATTEMPTS) {
    localStorage.setItem(`${LOCKOUT_UNTIL_KEY}_${deviceId}`, (Date.now() + LOCKOUT_DURATION_MS).toString());
    localStorage.removeItem(`${MAX_ATTEMPTS_KEY}_${deviceId}`);
    return {
      success: false,
      attemptsRemaining: 0,
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS
    };
  }
  
  localStorage.setItem(`${MAX_ATTEMPTS_KEY}_${deviceId}`, newAttempts.toString());
  return {
    success: false,
    attemptsRemaining: MAX_PIN_ATTEMPTS - newAttempts
  };
}

export function hasPinSet(): boolean {
  const deviceId = getDeviceId();
  return localStorage.getItem(`${PIN_HASH_KEY}_${deviceId}`) !== null;
}

export function getPinSetupDate(): Date | null {
  const deviceId = getDeviceId();
  const dateStr = localStorage.getItem(`${PIN_SETUP_AT_KEY}_${deviceId}`);
  return dateStr ? new Date(parseInt(dateStr, 10)) : null;
}

export function getRemainingLockoutTime(): number {
  const deviceId = getDeviceId();
  const lockoutUntilStr = localStorage.getItem(`${LOCKOUT_UNTIL_KEY}_${deviceId}`);
  if (!lockoutUntilStr) return 0;
  
  const lockoutUntil = parseInt(lockoutUntilStr, 10);
  const remaining = lockoutUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function clearPin(): void {
  const deviceId = getDeviceId();
  localStorage.removeItem(`${PIN_HASH_KEY}_${deviceId}`);
  localStorage.removeItem(`${PIN_SETUP_AT_KEY}_${deviceId}`);
  localStorage.removeItem(`${MAX_ATTEMPTS_KEY}_${deviceId}`);
  localStorage.removeItem(`${LOCKOUT_UNTIL_KEY}_${deviceId}`);
}