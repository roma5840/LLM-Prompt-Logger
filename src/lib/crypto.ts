// src/lib/crypto.ts

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Function to derive a key from a password and salt using PBKDF2 for encryption
export async function deriveEncryptionKey(password: string, salt: string): Promise<CryptoKey> {
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

// Function to derive a deterministic access token from a password and salt
export async function getAccessToken(password: string, salt: string): Promise<string> {
  const accessTokenSalt = salt + '::promptlog-access-token';
  const passwordBuffer = textEncoder.encode(password);
  const saltBuffer = textEncoder.encode(accessTokenSalt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive a 256-bit key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );

  // Export the key as raw bytes and convert to a hex string to serve as the token
  const keyBytes = await crypto.subtle.exportKey('raw', derivedKey);
  const hashArray = Array.from(new Uint8Array(keyBytes));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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