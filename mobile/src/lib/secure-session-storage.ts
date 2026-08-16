import * as aesjs from 'aes-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Encrypted replacement for plain AsyncStorage session persistence.
 * SecureStore alone can't hold a refresh token (size limits), so a random
 * AES-256 key lives in SecureStore instead, encrypting whatever blob goes
 * into AsyncStorage. AsyncStorage itself never sees plaintext.
 */

const ENCRYPTION_KEY_ITEM = 'animo.supabase.session-key';

async function getEncryptionKey(): Promise<Uint8Array> {
  const existingHex = await SecureStore.getItemAsync(ENCRYPTION_KEY_ITEM);
  if (existingHex) {
    return aesjs.utils.hex.toBytes(existingHex);
  }
  const key = await Crypto.getRandomBytesAsync(32); // AES-256
  await SecureStore.setItemAsync(ENCRYPTION_KEY_ITEM, aesjs.utils.hex.fromBytes(key));
  return key;
}

/**
 * True only in a bare Node.js process (e.g. Expo Router's static/server
 * web export pre-rendering a route). React Native polyfills `window` on
 * native, and real browsers obviously have it, so this only trips during
 * server-side rendering — where AsyncStorage's web backend would otherwise
 * throw trying to touch `window.localStorage`.
 */
const isServerRenderContext = typeof window === 'undefined';

/** Drop-in storage adapter for Supabase's `auth.storage` option. */
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isServerRenderContext) return null;

    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;

    const [ivHex, dataHex] = stored.split(':');
    if (!ivHex || !dataHex) return null;

    try {
      const encryptionKey = await getEncryptionKey();
      const iv = aesjs.utils.hex.toBytes(ivHex);
      const data = aesjs.utils.hex.toBytes(dataHex);
      const aesCbc = new aesjs.ModeOfOperation.cbc(encryptionKey, iv);
      const decryptedBytes = aesjs.padding.pkcs7.strip(aesCbc.decrypt(data));
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch (err) {
      // Undecryptable — fail safe to "no session" instead of crashing.
      console.warn('[secure-session-storage] failed to decrypt stored session, clearing', err);
      await AsyncStorage.removeItem(key);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isServerRenderContext) return;

    const encryptionKey = await getEncryptionKey();
    const iv = await Crypto.getRandomBytesAsync(16);
    const dataBytes = aesjs.padding.pkcs7.pad(aesjs.utils.utf8.toBytes(value));
    const aesCbc = new aesjs.ModeOfOperation.cbc(encryptionKey, iv);
    const encryptedBytes = aesCbc.encrypt(dataBytes);
    const payload = `${aesjs.utils.hex.fromBytes(iv)}:${aesjs.utils.hex.fromBytes(encryptedBytes)}`;
    await AsyncStorage.setItem(key, payload);
  },

  async removeItem(key: string): Promise<void> {
    if (isServerRenderContext) return;

    await AsyncStorage.removeItem(key);
  },
};
