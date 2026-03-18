import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import api from './api';

export interface PasskeyStatus {
  hasPasskey: boolean;
  credentials: Array<{
    id: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string;
  }>;
}

export interface WebAuthnSupport {
  isSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  isAutofillSupported: boolean;
}

/**
 * Check if WebAuthn is supported on this device/browser
 */
export async function checkWebAuthnSupport(): Promise<WebAuthnSupport> {
  const isSupported = browserSupportsWebAuthn();
  let isPlatformAuthenticatorAvailable = false;
  let isAutofillSupported = false;

  if (isSupported) {
    try {
      isPlatformAuthenticatorAvailable = await platformAuthenticatorIsAvailable();
      isAutofillSupported = await browserSupportsWebAuthnAutofill();
    } catch (e) {
      console.warn('Error checking WebAuthn capabilities:', e);
    }
  }

  return {
    isSupported,
    isPlatformAuthenticatorAvailable,
    isAutofillSupported,
  };
}

/**
 * Get passkey status for the current user
 */
export async function getPasskeyStatus(): Promise<PasskeyStatus> {
  const response = await api.get('/auth/webauthn/status');
  return response.data;
}

/**
 * Register a new passkey for the current user
 */
export async function registerPasskey(deviceName?: string): Promise<{
  success: boolean;
  message: string;
  verified: boolean;
}> {
  // Step 1: Get registration options from server
  const optionsResponse = await api.post('/auth/webauthn/register/options', {
    deviceName,
  });

  const options: PublicKeyCredentialCreationOptionsJSON = optionsResponse.data.options;

  // Step 2: Start registration ceremony (browser prompts for biometric)
  let registrationResponse: RegistrationResponseJSON;
  try {
    registrationResponse = await startRegistration({ optionsJSON: options });
  } catch (error: any) {
    // Handle user cancellation or other errors
    if (error.name === 'NotAllowedError') {
      throw new Error('הרישום בוטל על ידי המשתמש');
    }
    if (error.name === 'InvalidStateError') {
      throw new Error('מפתח גישה כבר קיים במכשיר זה');
    }
    throw new Error(`שגיאה ברישום מפתח הגישה: ${error.message}`);
  }

  // Step 3: Send registration response to server for verification
  const verifyResponse = await api.post('/auth/webauthn/register/verify', {
    ...registrationResponse,
    deviceName,
  });

  return verifyResponse.data;
}

/**
 * Authenticate with passkey (login)
 */
export async function authenticateWithPasskey(personalId?: string): Promise<{
  success: boolean;
  message: string;
  token: string;
  user: any;
}> {
  // Step 1: Get authentication options from server
  const optionsResponse = await api.post('/auth/webauthn/authenticate/options', {
    personalId,
  });

  const options: PublicKeyCredentialRequestOptionsJSON = optionsResponse.data.options;

  // Step 2: Start authentication ceremony (browser prompts for biometric)
  let authenticationResponse: AuthenticationResponseJSON;
  try {
    authenticationResponse = await startAuthentication({ optionsJSON: options });
  } catch (error: any) {
    // Handle user cancellation or other errors
    if (error.name === 'NotAllowedError') {
      throw new Error('האימות בוטל על ידי המשתמש');
    }
    throw new Error(`שגיאה באימות: ${error.message}`);
  }

  // Step 3: Send authentication response to server for verification
  const verifyResponse = await api.post('/auth/webauthn/authenticate/verify', authenticationResponse);

  return verifyResponse.data;
}

/**
 * Delete a passkey credential
 */
export async function deletePasskey(credentialId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await api.delete(`/auth/webauthn/credentials/${credentialId}`);
  return response.data;
}

/**
 * Get a user-friendly device name based on user agent
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('iphone')) {
    return 'iPhone';
  } else if (ua.includes('ipad')) {
    return 'iPad';
  } else if (ua.includes('mac')) {
    return 'Mac';
  } else if (ua.includes('android')) {
    // Try to extract device model
    const match = ua.match(/android[^;]*;\s*([^)]*)/i);
    if (match && match[1]) {
      return match[1].split('build')[0].trim() || 'Android';
    }
    return 'Android';
  } else if (ua.includes('windows')) {
    return 'Windows';
  } else if (ua.includes('linux')) {
    return 'Linux';
  }

  return 'מכשיר לא ידוע';
}
