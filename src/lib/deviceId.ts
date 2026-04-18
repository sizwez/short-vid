const DEVICE_ID_KEY = 'mzansi_device_id';
const DEVICE_ID_GENERATED_AT_KEY = 'mzansi_device_id_generated_at';

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    localStorage.setItem(DEVICE_ID_GENERATED_AT_KEY, Date.now().toString());
  }
  
  return deviceId;
}

function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `dev_${timestamp}_${randomPart}_${randomPart2}`;
}

export function isNewDevice(): boolean {
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  return !deviceId;
}

export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_ID_GENERATED_AT_KEY);
}

export function getDeviceInfo(): {
  deviceId: string;
  isNewDevice: boolean;
  registeredAt: number | null;
} {
  const deviceId = getDeviceId();
  const registeredAtStr = localStorage.getItem(DEVICE_ID_GENERATED_AT_KEY);
  
  return {
    deviceId,
    isNewDevice: !registeredAtStr,
    registeredAt: registeredAtStr ? parseInt(registeredAtStr, 10) : null
  };
}