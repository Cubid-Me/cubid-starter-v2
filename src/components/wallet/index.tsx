import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from './nearWalletConfig';
import { Wallet as WalletIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CubidSDK } from 'cubid-sdk';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { WebAuthnCrypto } from '@/lib/webAuthnEncypt';
import { useAccount, useDisconnect } from 'wagmi';

// Constants for localStorage keys
const STORAGE_KEYS = {
    EVM_WALLETS: 'cubid_evm_wallets',
    NEAR_WALLETS: 'cubid_near_wallets',
};

interface WalletComp {
    type: 'evm' | 'near';
}

interface WalletInfo {
    address: string;
    type: 'connected' | 'created';
}

interface WalletStates {
    evm: WalletInfo[];
    near: WalletInfo[];
}

// Helper function to safely parse localStorage data
const getStoredWallets = (key: string): WalletInfo[] => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error parsing stored wallets:', error);
        return [];
    }
};

// Helper function to safely store wallet data
const storeWallets = (key: string, wallets: WalletInfo[]) => {
    try {
        localStorage.setItem(key, JSON.stringify(wallets));
    } catch (error) {
        console.error('Error storing wallets:', error);
    }
};

export const wallet = new Wallet({
    createAccessKeyFor: 'registry.i-am-human.near',
});

const sdk = new CubidSDK(
    process.env.NEXT_PUBLIC_DAPP_ID,
    process.env.NEXT_PUBLIC_API_KEY
);

wallet.startUp();

const WebAuthN = new WebAuthnCrypto();

// Wallet info display component remains unchanged
const WalletInfoDisplay = ({ address, explorerUrl, type, walletType }) => {
    const truncateAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                    {walletType === 'created' ? 'Created Account' : `Connected to ${type}`}
                </span>
                <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                    {walletType === 'created' ? 'Created' : 'Connected'}
                </span>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-white/80">
                        {truncateAddress(address)}
                    </span>
                    <button
                        onClick={() => navigator.clipboard.writeText(address)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                    >
                        Copy
                    </button>
                </div>
                <div className="flex justify-between">
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                        <span>View on Explorer</span>
                    </a>
                 
                </div>
            </div>
        </div>
    );
};

export const WalletComponent = (props: WalletComp) => {
    const inEvm = props.type === 'evm';

    // Initialize state with stored wallet data
    const [wallets, setWallets] = useState<WalletStates>(() => ({
        evm: getStoredWallets(STORAGE_KEYS.EVM_WALLETS),
        near: getStoredWallets(STORAGE_KEYS.NEAR_WALLETS),
    }));

    const [loading, setLoading] = useState<string | null>(null);
    const { user, setUser } = useAuth();
    const [sdkResponse, setSdkResponse] = useState<any>(null);
    const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
    const { disconnect } = useDisconnect()
    // Effect to persist wallet states when they change
    useEffect(() => {
        storeWallets(STORAGE_KEYS.EVM_WALLETS, wallets.evm);
        storeWallets(STORAGE_KEYS.NEAR_WALLETS, wallets.near);
    }, [wallets]);

    // Effect to handle EVM wallet connection
    useEffect(() => {
        console.log({ isEvmConnected, evmAddress })
        if (isEvmConnected && evmAddress) {
            setWallets((prev: any) => {
                const updatedEvm = prev.evm.some(w => w.address === evmAddress)
                    ? prev.evm
                    : [...prev.evm, { address: evmAddress, type: 'connected' }];
                return { ...prev, evm: updatedEvm };
            });
        } else {
            setWallets((prev: any) => {
                return { ...prev, evm: prev.evm.filter((item) => item.type === "connected") }
            });
        }
    }, [evmAddress, isEvmConnected]);

    // Effect to handle NEAR wallet connection
    useEffect(() => {
        const checkNearWallet = async () => {
            const wallet_data = (wallet as any).accountId;
            if (wallet_data) {
                setWallets((prev: any) => {
                    const updatedNear = prev.near.some(w => w.address === wallet_data)
                        ? prev.near
                        : [...prev.near, { address: wallet_data, type: 'connected' }];
                    return { ...prev, near: updatedNear };
                });
            }
        };

        checkNearWallet();
    }, []);

    const getExplorerUrl = useCallback((address: string) => {
        if (inEvm) {
            const baseUrl = 'https://etherscan.io';
            return `${baseUrl}/address/${address}`;
        }
        return `https://explorer.near.org/accounts/${address}`;
    }, [inEvm]);

    // Create user in Cubid
    const createUser = useCallback(async () => {
        if (user && !user.uuid) {
            setLoading('createUser');
            try {
                const response = await sdk.createUser({ email: user.email, phone: '' });
                const newUuid = response.user_id;
                setUser({ ...user, uuid: newUuid });
                setSdkResponse(response);
                localStorage.setItem('user_uuid', newUuid);
            } catch (error) {
                console.error('Error creating user:', error);
            } finally {
                setLoading(null);
            }
        }
    }, [user, setUser]);

    useEffect(() => {
        createUser();
    }, [createUser]);

    // Create on-chain account with persistence
    const createOnChainAccount = async () => {
        setLoading('creating');
        try {
            const { user_shares, public_address } = await sdk.encryptPrivateKey({
                user_id: user?.uuid,
            });

            const { data } = await supabase.from('accounts').insert({
                public_key: public_address,
                user_email: user?.email,
            }).select('*');

            if (data && data[0]) {
                await supabase.from('shamir_shares').insert({
                    app_share: user_shares?.[0],
                    account_id: data[0].id,
                });
            }

            await WebAuthN.generateKeyPair();
            await WebAuthN.encryptDeviceShare(user_shares?.[1]);

            // Update state and persist to localStorage
            setWallets(prev => {
                const networkType = inEvm ? 'evm' : 'near';
                const updatedWallets = {
                    ...prev,
                    [networkType]: [
                        ...prev[networkType],
                        { address: public_address, type: 'created' }
                    ]
                };

                // Store the updated wallets
                storeWallets(
                    inEvm ? STORAGE_KEYS.EVM_WALLETS : STORAGE_KEYS.NEAR_WALLETS,
                    updatedWallets[networkType]
                );

                return updatedWallets;
            });
        } catch (error) {
            console.error('Error creating account:', error);
        } finally {
            setLoading(null);
        }
    };

    const currentNetworkWallets = inEvm ? wallets.evm : wallets.near;

    console.log({ currentNetworkWallets, wallets })

    return (
        <div className="w-full mx-auto bg-black rounded-2xl p-6 shadow-2xl shadow-purple-500/10 border border-white/20">
            <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {inEvm ? 'EVM Wallets' : 'NEAR Protocol'}
                </h2>

                {currentNetworkWallets.map((wallet, index) => (
                    <WalletInfoDisplay
                        key={wallet.address}
                        address={wallet.address}
                        explorerUrl={getExplorerUrl(wallet.address)}
                        type={inEvm ? 'EVM' : 'NEAR'}
                        walletType={wallet.type}
                    />
                ))}

                {inEvm ? (
                    !isEvmConnected && (
                        <div className="group relative">
                            <ConnectButton />
                        </div>
                    )
                ) : (
                    !wallets.near.some(w => w) && (
                        <button
                            onClick={() => wallet.signIn()}
                            className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/25"
                        >
                            <div className="relative flex items-center justify-between rounded-2xl bg-black px-6 py-4 transition-all duration-500 group-hover:bg-opacity-90">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 p-2">
                                        <WalletIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-semibold text-white">
                                            Connect Wallet
                                        </span>
                                        <span className="text-sm text-white/60">
                                            Powered by NEAR
                                        </span>
                                    </div>
                                </div>

                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                                    <svg
                                        className="h-4 w-4 text-white transition-transform duration-500 group-hover:translate-x-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    )
                )}

                {!currentNetworkWallets.some(w => w) && (
                    <button
                        onClick={createOnChainAccount}
                        disabled={loading === 'creating'}
                        className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading === 'creating' ? (
                            'Creating Account...'
                        ) : (
                            'Create New On-Chain Account'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};