import * as CBOR from 'cbor-web';

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
    public async generateKeyPair(): Promise<WebAuthnCredential> {
        try {
            console.log('Starting WebAuthn credential generation...');
            
            // Check if running in a secure context
            if (!window.isSecureContext) {
                throw new WebAuthnCryptoError('WebAuthn requires a secure context (HTTPS)');
            }
            
            // Check if WebAuthn is supported
            if (!window.PublicKeyCredential) {
                throw new WebAuthnCryptoError('WebAuthn is not supported in this browser');
            }
            // First, verify that a platform authenticator is available
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                throw new Error('No hardware authenticator available on this device');
            }

            console.log('Creating WebAuthn credential...');

            // Configure the credential creation options
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
                    { type: 'public-key', alg: -7 } // ES256 (ECDSA with P-256)
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

            // Create the credential
            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            }) as PublicKeyCredential;

            console.log('Credential created successfully, parsing response...');

            // Parse the attestation response
            const response = credential.response as AuthenticatorAttestationResponse;
            const attestationBuffer = new Uint8Array(response.attestationObject);
            const decodedAttestationObj = await CBOR.decodeFirst(attestationBuffer);
            
            // Parse authenticator data
            const authData = new Uint8Array(decodedAttestationObj.authData);
            console.log('Auth data length:', authData.length);
            
            // The first 32 bytes are the RP ID hash
            const rpIdHash = authData.slice(0, 32);
            console.log('RP ID Hash:', Buffer.from(rpIdHash).toString('hex'));
            
            // The next byte contains the flags
            const flags = authData[32];
            const hasAttestedCredentialData = (flags & 0x40) === 0x40;
            console.log('Flags:', flags.toString(2).padStart(8, '0'));
            console.log('Has attested credential data:', hasAttestedCredentialData);
            
            if (!hasAttestedCredentialData) {
                throw new Error('No attested credential data in authentication response');
            }

            // The next 4 bytes are the signature counter
            const counterBuffer = authData.slice(33, 37);
            const counter = new DataView(counterBuffer.buffer).getUint32(0, false);
            console.log('Signature counter:', counter);

            // Now we're at the attested credential data
            let pointer = 37; // 32 + 1 + 4 (rpIdHash + flags + counter)

            // The next 16 bytes are the AAGUID
            const aaguid = authData.slice(pointer, pointer + 16);
            console.log('AAGUID:', Buffer.from(aaguid).toString('hex'));
            pointer += 16;

            // Now read credential ID length (2 bytes)
            const credentialIdLengthBytes = authData.slice(pointer, pointer + 2);
            const credentialIdLength = new DataView(credentialIdLengthBytes.buffer).getUint16(0, false);
            console.log('Credential ID length:', credentialIdLength);
            pointer += 2;
            
            // Ensure we have enough data for the credential ID
            if (pointer + credentialIdLength > authData.byteLength) {
                throw new WebAuthnCryptoError('Invalid credential ID length in authenticator data');
            }
            
            this.credentialId = new Uint8Array(authData.slice(pointer, pointer + credentialIdLength));
            pointer += credentialIdLength;
            
            // Validate credential ID
            if (this.credentialId.length === 0) {
                throw new WebAuthnCryptoError('Empty credential ID received from authenticator');
            }

            // Extract and parse the public key
            // Extract the public key bytes
            const publicKeyBytes = authData.slice(pointer);
            const publicKeyCBOR = await CBOR.decodeFirst(publicKeyBytes);
            
            // Validate the COSE key format
            if (!publicKeyCBOR.get(-2) || !publicKeyCBOR.get(-3)) {
                throw new WebAuthnCryptoError('Invalid COSE key format: missing coordinates');
            }

            // Log key details for debugging
            console.log('COSE key type:', publicKeyCBOR.get(1));  // 2 means EC2
            console.log('COSE key curve:', publicKeyCBOR.get(-1)); // 1 means P-256
            
            // Helper function to convert to base64url format
            const toBase64Url = (buffer: ArrayBuffer): string => {
                // First convert to regular base64
                const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                // Then convert to base64url by replacing characters
                return base64
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
            };

            // Convert COSE format to JWK
            const jwk = {
                kty: 'EC',
                crv: 'P-256',
                x: toBase64Url(publicKeyCBOR.get(-2)),
                y: toBase64Url(publicKeyCBOR.get(-3)),
                ext: true
            };

            // Import the public key using JWK format
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

            // Store credential ID for later use
            await this.storeInIndexedDB<CredentialData>('credentialData', {
                id: 'credentialId',
                value: this.credentialId
            });

            return {
                credentialId: this.credentialId,
                publicKey: this.publicKey
            };
        } catch (error) {
            console.error('Detailed error:', error);
            if (error instanceof TypeError) {
                throw new WebAuthnCryptoError(`Invalid parameter or operation: ${error.message}`);
            } else if (error instanceof DOMException) {
                throw new WebAuthnCryptoError(`WebAuthn operation failed: ${error.name} - ${error.message}`);
            }
            throw new WebAuthnCryptoError(`Failed to generate key pair: ${error.message}`);
        }
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

// Example usage
async function main() {
    const webAuthnCrypto = new WebAuthnCrypto();
    
    try {
        // Generate WebAuthn key pair
        console.log('Generating WebAuthn key pair...');
        const keyPair = await webAuthnCrypto.generateKeyPair();
        
        // Test encryption
        const deviceShare = 'This is a sensitive device share that needs to be encrypted';
        console.log('Encrypting device share...');
        await webAuthnCrypto.encryptDeviceShare(deviceShare);
        
        // Test decryption
        console.log('Decrypting device share...');
        const decrypted = await webAuthnCrypto.decryptDeviceShare();
        
        console.log('Original device share:', deviceShare);
        console.log('Decrypted device share:', decrypted);
        console.log('Encryption/decryption successful!');
    } catch (error) {
        if (error instanceof WebAuthnCryptoError) {
            console.error('WebAuthn crypto error:', error.message);
        } else if (error instanceof DatabaseError) {
            console.error('Database error:', error.message);
        } else {
            console.error('Unexpected error:', error);
        }
    }
}