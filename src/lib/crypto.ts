// src/lib/crypto.ts

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Function to derive a key from a password and salt using PBKDF2
export async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const passwordBuffer = textEncoder.encode(password);
  const saltBuffer = textEncoder.encode(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Function to encrypt data using AES-GCM
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const dataBuffer = textEncoder.encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is recommended for AES-GCM

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Prepend IV to the ciphertext for storage
  const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combinedBuffer.set(iv, 0);
  combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

  // Return as a base64 string
  return window.btoa(String.fromCharCode.apply(null, Array.from(combinedBuffer)));
}

// Function to decrypt data using AES-GCM
export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
  try {
    const combinedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const iv = combinedBuffer.slice(0, 12);
    const ciphertext = combinedBuffer.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    return textDecoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Invalid master password or corrupted data.");
  }
}