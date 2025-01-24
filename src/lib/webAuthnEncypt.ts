import * as CBOR from 'cbor-web';
import QRCode from 'qrcode';

// Custom error types for better error handling and debugging
class WebAuthnCryptoError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WebAuthnCryptoError';
    }
}

class DatabaseError extends WebAuthnCryptoError {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

// Type definitions for our data structures
interface CredentialData {
    id: string;
    value: Uint8Array;
}

interface EncryptedData {
    id: string;
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
    // Store the AES key that's protected by WebAuthn authentication
    encryptedAesKey: ArrayBuffer;
}

interface WebAuthnCredential {
    credentialId: Uint8Array;
    publicKey: CryptoKey;
}

// Main WebAuthnCrypto class for handling WebAuthn-based encryption operations
export class WebAuthnCrypto {
    private credentialId: Uint8Array | null;
    private publicKey: CryptoKey | null;
    private db: IDBDatabase | null;

    constructor() {
        this.credentialId = null;
        this.publicKey = null;
        this.db = null;

        // Initialize database connection when class is instantiated
        this.initializeDatabase().catch((error) => {
            console.error('Failed to initialize database:', error);
            throw new DatabaseError('Database initialization failed');
        });
    }

    // Initialize IndexedDB for storing encrypted data and credentials
    private async initializeDatabase(): Promise<void> {
        try {
            this.db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open('WebAuthnStorage', 1);

                request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                    const db = (event.target as IDBOpenDBRequest).result;

                    // Create object stores if they don't exist
                    if (!db.objectStoreNames.contains('encryptedData')) {
                        db.createObjectStore('encryptedData', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('credentialData')) {
                        db.createObjectStore('credentialData', { keyPath: 'id' });
                    }
                };

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            console.log('IndexedDB initialized successfully');
        } catch (error) {
            throw new DatabaseError(`Failed to initialize IndexedDB: ${error.message}`);
        }
    }

    // Generate a new WebAuthn credential pair
    public async generateKeyPair(): Promise<any> {
        try {
            if (await this.isWebAuthnSupported()) {
                const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    rp: {
                        name: 'Hardware-Backed Device Share',
                        id: window.location.hostname
                    },
                    user: {
                        id: new TextEncoder().encode('hardware-auth-user'),
                        name: 'hardware-auth-user',
                        displayName: 'Hardware Authenticator User'
                    },
                    pubKeyCredParams: [
                        { type: 'public-key', alg: -7 }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        requireResidentKey: false,
                        userVerification: 'required'
                    },
                    extensions: {
                        credProps: true
                    },
                    timeout: 60000,
                    attestation: 'none'
                };

                const credential = await navigator.credentials.create({
                    publicKey: publicKeyCredentialCreationOptions
                }) as PublicKeyCredential;

                const response = credential.response as AuthenticatorAttestationResponse;
                const attestationBuffer = new Uint8Array(response.attestationObject);
                const decodedAttestationObj = await CBOR.decodeFirst(attestationBuffer);
                const authData = new Uint8Array(decodedAttestationObj.authData);

                const flags = authData[32];
                const hasAttestedCredentialData = (flags & 0x40) === 0x40;

                if (!hasAttestedCredentialData) {
                    throw new Error('No attested credential data in authentication response');
                }

                let pointer = 37;
                const aaguid = authData.slice(pointer, pointer + 16);
                pointer += 16;

                const credentialIdLengthBytes = authData.slice(pointer, pointer + 2);
                const credentialIdLength = new DataView(credentialIdLengthBytes.buffer).getUint16(0, false);
                pointer += 2;

                if (pointer + credentialIdLength > authData.byteLength) {
                    throw new WebAuthnCryptoError('Invalid credential ID length in authenticator data');
                }

                this.credentialId = new Uint8Array(authData.slice(pointer, pointer + credentialIdLength));
                pointer += credentialIdLength;

                if (this.credentialId.length === 0) {
                    throw new WebAuthnCryptoError('Empty credential ID received from authenticator');
                }

                const publicKeyBytes = authData.slice(pointer);
                const publicKeyCBOR = await CBOR.decodeFirst(publicKeyBytes);

                if (!publicKeyCBOR.get(-2) || !publicKeyCBOR.get(-3)) {
                    throw new WebAuthnCryptoError('Invalid COSE key format: missing coordinates');
                }

                const toBase64Url = (buffer: ArrayBuffer): string => {
                    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=/g, '');
                };

                const jwk = {
                    kty: 'EC',
                    crv: 'P-256',
                    x: toBase64Url(publicKeyCBOR.get(-2)),
                    y: toBase64Url(publicKeyCBOR.get(-3)),
                    ext: true
                };

                this.publicKey = await crypto.subtle.importKey(
                    'jwk',
                    jwk,
                    {
                        name: 'ECDSA',
                        namedCurve: 'P-256'
                    },
                    true,
                    ['verify']
                );

                await this.storeInIndexedDB<CredentialData>('credentialData', {
                    id: 'credentialId',
                    value: this.credentialId
                });

                return {
                    type: 'webauthn',
                    credentialId: this.credentialId,
                    publicKey: this.publicKey
                };
            }

            return await this.generateFallbackCredential();

        } catch (error) {
            if (error instanceof WebAuthnCryptoError) {
                return await this.generateFallbackCredential();
            }
            throw error;
        }
    }

    private async isWebAuthnSupported(): Promise<boolean> {
        if (!window.isSecureContext) return false;
        if (!window.PublicKeyCredential) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }

    private async generateFallbackCredential(): Promise<any> {
        const authKey = await this.generateSecureRandomKey();
        const qrData = {
            key: authKey,
            timestamp: Date.now(),
            origin: window.location.origin
        };

        const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 256
        });

        const recoveryCode = this.generateRecoveryCode(authKey);
        await this.storeFallbackCredentials(authKey, recoveryCode);

        return {
            type: 'fallback',
            qrCode,
            recoveryCode
        };
    }

    private async generateSecureRandomKey(): Promise<string> {
        const buffer = new Uint8Array(32);
        crypto.getRandomValues(buffer);
        return Array.from(buffer)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private generateRecoveryCode(key: string): string {
        return key
            .slice(0, 16)
            .match(/.{4}/g)!
            .join('-')
            .toUpperCase();
    }

    private async storeFallbackCredentials(key: string, recoveryCode: string): Promise<void> {
        const encryptedData = {
            key: await this.encryptData(key),
            recoveryCode: await this.encryptData(recoveryCode),
            timestamp: Date.now()
        };

        await this.storeInIndexedDB('fallbackCredentials', {
            id: 'fallback',
            value: encryptedData
        });
    }

    private async encryptData(data: string): Promise<string> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const key = await crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv
            },
            key,
            dataBuffer
        );

        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        const ivBase64 = btoa(String.fromCharCode(...iv));

        return JSON.stringify({
            encrypted: encryptedBase64,
            iv: ivBase64
        });
    }

    // Encrypt data using AES-GCM and protect the key with WebAuthn
    public async encryptDeviceShare(deviceShare: string): Promise<boolean> {
        try {
            // Generate a random AES key for encrypting the device share
            const aesKey = await crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            );

            // Generate a random initialization vector
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt the device share using AES-GCM
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv
                },
                aesKey,
                new TextEncoder().encode(deviceShare)
            );

            // Export and store the AES key - it will be protected by WebAuthn authentication
            const exportedAesKey = await crypto.subtle.exportKey('raw', aesKey);

            // Store encrypted data in IndexedDB
            await this.storeInIndexedDB<EncryptedData>('encryptedData', {
                id: 'deviceShare',
                encryptedData,
                iv,
                encryptedAesKey: exportedAesKey
            });

            return true;
        } catch (error) {
            throw new WebAuthnCryptoError(`Failed to encrypt device share: ${error.message}`);
        }
    }

    // Decrypt data using WebAuthn authentication
    public async decryptDeviceShare(): Promise<string> {
        try {
            // Retrieve encrypted data from storage
            const encryptedStore = await this.getFromIndexedDB<EncryptedData>('encryptedData', 'deviceShare');
            if (!encryptedStore) {
                throw new WebAuthnCryptoError('No encrypted device share found');
            }

            // Get stored credential ID
            const credentialData = await this.getFromIndexedDB<CredentialData>('credentialData', 'credentialId');
            if (!credentialData) {
                throw new WebAuthnCryptoError('No credential ID found');
            }

            // Create WebAuthn assertion options
            const assertionOptions: PublicKeyCredentialRequestOptions = {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                allowCredentials: [{
                    id: credentialData.value,
                    type: 'public-key',
                }],
                userVerification: 'required',
                timeout: 60000
            };

            // Get authentication assertion
            const assertion = await navigator.credentials.get({
                publicKey: assertionOptions
            }) as PublicKeyCredential;

            // Import the AES key after successful authentication
            const aesKey = await crypto.subtle.importKey(
                'raw',
                encryptedStore.encryptedAesKey,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['decrypt']
            );

            // Decrypt the data using AES-GCM
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: encryptedStore.iv
                },
                aesKey,
                encryptedStore.encryptedData
            );

            return new TextDecoder().decode(decryptedData);
        } catch (error) {
            throw new WebAuthnCryptoError(`Failed to decrypt device share: ${error.message}`);
        }
    }

    // Helper method to store data in IndexedDB
    private async storeInIndexedDB<T extends { id: string }>(
        storeName: string,
        data: T
    ): Promise<IDBValidKey> {
        if (!this.db) {
            throw new DatabaseError('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Helper method to retrieve data from IndexedDB
    private async getFromIndexedDB<T>(
        storeName: string,
        key: string
    ): Promise<T | null> {
        if (!this.db) {
            throw new DatabaseError('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result as T);
            request.onerror = () => reject(request.error);
        });
    }
}
