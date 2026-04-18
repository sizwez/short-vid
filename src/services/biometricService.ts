import { getDeviceId } from '../lib/deviceId';

const BIOMETRIC_ENABLED_KEY = 'mzansi_biometric_enabled';
const WEBAUTHN_CREDENTIAL_ID_KEY = 'mzansi_webauthn_cred_id';
const WEBAUTHN_CREDENTIAL_REGISTERED_KEY = 'mzansi_webauthn_registered';

export interface BiometricAvailability {
  available: boolean;
  supported: boolean;
  reason?: string;
}

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (!window.PublicKeyCredential) {
    return {
      available: false,
      supported: false,
      reason: 'WebAuthn is not supported in this browser'
    };
  }
  
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return {
      available,
      supported: true
    };
  } catch {
    return {
      available: false,
      supported: true,
      reason: 'Could not determine biometric availability'
    };
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function registerBiometric(): Promise<{ success: boolean; error?: string }> {
  const availability = await checkBiometricAvailability();
  if (!availability.supported) {
    return { success: false, error: availability.reason || 'Biometric not supported' };
  }
  if (!availability.available) {
    return { success: false, error: 'No platform authenticator available' };
  }
  
  const deviceId = getDeviceId();
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const credentialId = arrayBufferToBase64(randomBytes);
  
  const createCredentialOptions: PublicKeyCredentialCreationOptions = {
    challenge: new Uint8Array([
      0x8C, 0x8A, 0x84, 0xA6, 0x48, 0xF5, 0x59, 0x56,
      0x9D, 0xAD, 0xD0, 0x4F, 0x1E, 0x9C, 0x5D, 0x7A,
      0x83, 0x25, 0xDC, 0x8B, 0xD0, 0x63, 0xD9, 0x30,
      0xE5, 0x4B, 0xFE, 0x6C, 0x6B, 0xF3, 0xD7, 0x35
    ]).buffer,
    rp: {
      name: 'Mzansi Videos',
      id: window.location.hostname || 'mzansi-videos.com'
    },
    user: {
      id: new TextEncoder().encode(deviceId),
      name: `user_${deviceId}`,
      displayName: 'Mzansi Videos User'
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' }
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred'
    }
  };
  
  try {
    const credential = await navigator.credentials.create({
      publicKey: createCredentialOptions
    }) as PublicKeyCredential | null;
    
    if (!credential) {
      return { success: false, error: 'Biometric registration failed' };
    }
    
    const storedCredentialId = credential.id;
    localStorage.setItem(`${WEBAUTHN_CREDENTIAL_ID_KEY}_${deviceId}`, storedCredentialId);
    localStorage.setItem(`${WEBAUTHN_CREDENTIAL_REGISTERED_KEY}_${deviceId}`, 'true');
    localStorage.setItem(`${BIOMETRIC_ENABLED_KEY}_${deviceId}`, 'true');
    
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Biometric registration failed';
    return { success: false, error: message };
  }
}

export async function verifyBiometric(): Promise<{ success: boolean; error?: string }> {
  const availability = await checkBiometricAvailability();
  if (!availability.supported) {
    return { success: false, error: availability.reason || 'Biometric not supported' };
  }
  if (!availability.available) {
    return { success: false, error: 'No platform authenticator available' };
  }
  
  const deviceId = getDeviceId();
  const credentialId = localStorage.getItem(`${WEBAUTHN_CREDENTIAL_ID_KEY}_${deviceId}`);
  
  if (!credentialId) {
    return { success: false, error: 'Biometric not registered' };
  }
  
  const getCredentialOptions: PublicKeyCredentialRequestOptions = {
    challenge: new Uint8Array([
      0x8C, 0x8A, 0x84, 0xA6, 0x48, 0xF5, 0x59, 0x56,
      0x9D, 0xAD, 0xD0, 0x4F, 0x1E, 0x9C, 0x5D, 0x7A,
      0x83, 0x25, 0xDC, 0x8B, 0xD0, 0x63, 0xD9, 0x30,
      0xE5, 0x4B, 0xFE, 0x6C, 0x6B, 0xF3, 0xD7, 0x35
    ]).buffer,
    timeout: 60000,
    rpId: window.location.hostname || 'mzansi-videos.com',
    userVerification: 'required',
    allowCredentials: [
      {
        type: 'public-key',
        id: base64ToArrayBuffer(credentialId)
      }
    ]
  };
  
  try {
    const assertion = await navigator.credentials.get({
      publicKey: getCredentialOptions
    }) as PublicKeyCredential | null;
    
    if (!assertion) {
      return { success: false, error: 'Biometric verification failed' };
    }
    
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Biometric verification failed';
    if (message.includes('NotAllowedError')) {
      return { success: false, error: 'Biometric verification was cancelled' };
    }
    return { success: false, error: message };
  }
}

export function isBiometricEnabled(): boolean {
  const deviceId = getDeviceId();
  return localStorage.getItem(`${BIOMETRIC_ENABLED_KEY}_${deviceId}`) === 'true';
}

export function isBiometricRegistered(): boolean {
  const deviceId = getDeviceId();
  return localStorage.getItem(`${WEBAUTHN_CREDENTIAL_REGISTERED_KEY}_${deviceId}`) === 'true';
}

export function disableBiometric(): void {
  const deviceId = getDeviceId();
  localStorage.removeItem(`${BIOMETRIC_ENABLED_KEY}_${deviceId}`);
  localStorage.removeItem(`${WEBAUTHN_CREDENTIAL_ID_KEY}_${deviceId}`);
  localStorage.removeItem(`${WEBAUTHN_CREDENTIAL_REGISTERED_KEY}_${deviceId}`);
}

export async function getBiometricStatus(): Promise<{
  enabled: boolean;
  registered: boolean;
  available: boolean;
}> {
  const availability = await checkBiometricAvailability();
  const deviceId = getDeviceId();
  
  return {
    available: availability.available,
    registered: localStorage.getItem(`${WEBAUTHN_CREDENTIAL_REGISTERED_KEY}_${deviceId}`) === 'true',
    enabled: localStorage.getItem(`${BIOMETRIC_ENABLED_KEY}_${deviceId}`) === 'true'
  };
}