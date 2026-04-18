import { getDeviceId } from '../lib/deviceId';

const SA_WORDS = [
  'amapiano', 'biltong', 'braai', 'protea', 'vuvuzela', 'gogo', 'ubuntu', 
  'lekker', 'howzit', 'dagga', 'kop', 'mielie', 'robot', 'sangoma', 
  'sjambok', 'takkie', 'veld', 'vis', 'vlei', 'wyn'
];

const MNEMONIC_HASH_KEY = 'mzansi_mnemonic_hash';

export async function generateMnemonic(): Promise<string[]> {
  const words: string[] = [];
  const indices = new Set<number>();
  
  while (words.length < 3) {
    const randomIndex = Math.floor(Math.random() * SA_WORDS.length);
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex);
      words.push(SA_WORDS[randomIndex]);
    }
  }
  
  return words;
}

async function hashMnemonic(words: string[]): Promise<string> {
  const text = words.map(w => w.trim().toLowerCase()).sort().join('-');
  const encoder = new TextEncoder();
  const data = encoder.encode(text + '_mzansi_identity_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function saveMnemonic(words: string[]): Promise<void> {
  const deviceId = getDeviceId();
  const hash = await hashMnemonic(words);
  localStorage.setItem(`${MNEMONIC_HASH_KEY}_${deviceId}`, hash);
}

export async function verifyMnemonic(words: string[]): Promise<boolean> {
  const deviceId = getDeviceId();
  const storedHash = localStorage.getItem(`${MNEMONIC_HASH_KEY}_${deviceId}`);
  
  if (!storedHash) return false;
  
  const inputHash = await hashMnemonic(words);
  return inputHash === storedHash;
}

export function hasMnemonicSet(): boolean {
  const deviceId = getDeviceId();
  return localStorage.getItem(`${MNEMONIC_HASH_KEY}_${deviceId}`) !== null;
}
