import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from './nearWalletConfig';
import { WalletIcon, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CubidSDK } from 'cubid-sdk';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { WebAuthnCrypto } from '@/lib/webAuthnEncypt';
import { useAccount, useDisconnect } from 'wagmi';

interface WalletComp {
    type: 'evm' | 'near';
}

interface WalletInfo {
    address: string;
    type: 'connected' | 'created';
    timestamp: number;
}

interface WalletStates {
    evm: WalletInfo[];
    near: WalletInfo[];
}

export const wallet = new Wallet({
    createAccessKeyFor: 'registry.i-am-human.near',
});

const sdk = new CubidSDK(
    process.env.NEXT_PUBLIC_DAPP_ID,
    process.env.NEXT_PUBLIC_API_KEY
);

wallet.startUp();

const WebAuthN = new WebAuthnCrypto();

const WalletInfoDisplay = ({ address, explorerUrl, type, walletType, timestamp }) => {
    const truncateAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
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
                <div className="text-xs text-gray-500">
                    Connected: {formatDate(timestamp)}
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

const AddWalletButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/25"
    >
        <div className="relative flex items-center justify-between rounded-2xl bg-black px-6 py-4 transition-all duration-500 group-hover:bg-opacity-90">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 p-2">
                    <Plus className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-semibold text-white">
                        Add New Wallet
                    </span>
                </div>
            </div>
        </div>
    </button>
);

const AddWalletOptions = ({ onConnectWallet, onCreateWallet, type, loading }) => (
    <div className="flex flex-col gap-4 mt-4">
        {type === 'evm' ? (
            <div className="group relative">
                <ConnectButton />
            </div>
        ) : (
            <button
                onClick={onConnectWallet}
                className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 transition-all duration-500 hover:scale-[1.01]"
            >
                <div className="relative flex items-center justify-between rounded-2xl bg-black px-6 py-4 transition-all duration-500 group-hover:bg-opacity-90">
                    <span className="text-lg font-semibold text-white">
                        Connect NEAR Wallet
                    </span>
                </div>
            </button>
        )}

        <button
            onClick={onCreateWallet}
            disabled={loading === 'creating'}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading === 'creating' ? 'Creating Account...' : 'Create New On-Chain Account'}
        </button>
    </div>
);

export const WalletComponent = (props: WalletComp) => {
    const inEvm = props.type === 'evm';
    const { disconnect } = useDisconnect();
    const [showAddOptions, setShowAddOptions] = useState(false);
    const [wallets, setWallets] = useState<WalletStates>({ evm: [], near: [] });
    const [loading, setLoading] = useState<string | null>(null);
    const { user, setUser } = useAuth();
    const [sdkResponse, setSdkResponse] = useState<any>(null);
    const { address: evmAddress, isConnected: isEvmConnected } = useAccount();

    const fetchWallets = useCallback(async () => {
        if (!user?.uuid) return;
        try {
            const [evmResponse, nearResponse] = await Promise.all([
                fetch(`/api/wallets?userId=${user.uuid}&type=evm`),
                fetch(`/api/wallets?userId=${user.uuid}&type=near`),
            ]);
            
            const evmWallets = evmResponse.ok ? await evmResponse.json() : [];
            const nearWallets = nearResponse.ok ? await nearResponse.json() : [];
            
            setWallets({ evm: evmWallets, near: nearWallets });
        } catch (error) {
            console.error('Error fetching wallets:', error);
        }
    }, [user?.uuid]);

    const saveWallets = useCallback(async (type: 'evm' | 'near', wallets: WalletInfo[]) => {
        if (!user?.uuid) return;
        try {
            await fetch('/api/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uuid,
                    type,
                    wallets
                }),
            });
        } catch (error) {
            console.error('Error saving wallets:', error);
        }
    }, [user?.uuid]);

    useEffect(() => {
        fetchWallets();
    }, [fetchWallets]);

    useEffect(() => {
        saveWallets('evm', wallets.evm);
    }, [wallets.evm, saveWallets]);

    useEffect(() => {
        saveWallets('near', wallets.near);
    }, [wallets.near, saveWallets]);

    useEffect(() => {
        if (isEvmConnected && evmAddress) {
            setWallets((prev: any) => {
                const existingWallet = prev.evm.find((w: WalletInfo) => w.address === evmAddress);
                if (existingWallet) return prev;
                
                const timestamp = Date.now();
                return {
                    ...prev,
                    evm: [...prev.evm, { address: evmAddress, type: 'connected', timestamp }]
                };
            });
            disconnect();
        }
    }, [evmAddress, isEvmConnected, disconnect]);

    useEffect(() => {
        const checkNearWallet = async () => {
            const wallet_data = (wallet as any).accountId;
            if (wallet_data) {
                setWallets((prev: any) => {
                    const existingWallet = prev.near.find((w: WalletInfo) => w.address === wallet_data);
                    if (existingWallet) return prev;

                    const timestamp = Date.now();
                    return {
                        ...prev,
                        near: [...prev.near, { address: wallet_data, type: 'connected', timestamp }]
                    };
                });
                await wallet.signOut();
            }
        };

        checkNearWallet();
    }, []);

    const getExplorerUrl = useCallback((address: string) => {
        if (inEvm) {
            return `https://etherscan.io/address/${address}`;
        }
        return `https://explorer.near.org/accounts/${address}`;
    }, [inEvm]);

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

    const createOnChainAccount = async () => {
        setLoading('creating');
        try {
            const { user_shares, public_address } = await sdk.encryptPrivateKey({
                user_id: user?.uuid,
                wallet_type: inEvm ? "ethereum" : "near"
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

            const timestamp = Date.now();
            setWallets(prev => ({
                ...prev,
                [inEvm ? 'evm' : 'near']: [
                    ...prev[inEvm ? 'evm' : 'near'],
                    { address: public_address, type: 'created', timestamp }
                ]
            }));
        } catch (error) {
            console.error('Error creating account:', error);
        } finally {
            setLoading(null);
            setShowAddOptions(false);
        }
    };

    const handleAddWallet = () => {
        setShowAddOptions(true);
    };

    const currentNetworkWallets = inEvm ? wallets.evm : wallets.near;
    const sortedWallets = [...currentNetworkWallets].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="w-full mx-auto bg-black rounded-2xl p-6 shadow-2xl shadow-purple-500/10 border border-white/20">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {inEvm ? 'EVM Wallets' : 'NEAR Protocol'}
                    </h2>
                    <button
                        onClick={handleAddWallet}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Add Wallet
                    </button>
                </div>

                {sortedWallets.map((wallet) => (
                    <WalletInfoDisplay
                        key={wallet.address}
                        address={wallet.address}
                        explorerUrl={getExplorerUrl(wallet.address)}
                        type={inEvm ? 'EVM' : 'NEAR'}
                        walletType={wallet.type}
                        timestamp={wallet.timestamp}
                    />
                ))}

                {showAddOptions && (
                    <AddWalletOptions
                        type={inEvm ? 'evm' : 'near'}
                        onConnectWallet={() => wallet.signIn()}
                        onCreateWallet={createOnChainAccount}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};