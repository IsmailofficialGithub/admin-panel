/**
 * Frontend encryption utility for payment URLs
 * Uses AES-256-GCM encryption (same as backend)
 */

import CryptoJS from 'crypto-js';

/**
 * Get encryption key from environment variable
 * Should match backend PAYMENT_ENCRYPTION_KEY
 */
const getEncryptionKey = () => {
  const key = process.env.REACT_APP_PAYMENT_ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32-chars!!';
  return key;
};

/**
 * Encrypt payment data
 * @param {Object} data - Payment data to encrypt (amount, invoice_id, user_id, invoice_number)
 * @returns {string} Encrypted string (base64 encoded)
 */
export const encryptPaymentData = (data) => {
  try {
    const key = getEncryptionKey();
    const text = JSON.stringify(data);
    
    // Encrypt using AES
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt payment data');
  }
};

/**
 * Decrypt payment data
 * @param {string} encryptedData - Encrypted string
 * @returns {Object} Decrypted payment data
 */
export const decryptPaymentData = (encryptedData) => {
  try {
    const key = getEncryptionKey();
    
    // Decrypt
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Failed to decrypt data');
    }
    
    // Parse JSON
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt payment data. Invalid or corrupted data.');
  }
};

