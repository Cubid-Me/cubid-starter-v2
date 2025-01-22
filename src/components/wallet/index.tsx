import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from './nearWalletConfig'
import { ArrowRightOnRectangleIcon, WalletIcon, ComputerDesktopIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { CubidSDK } from 'cubid-sdk';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';

interface WalletComp {
    type: "evm" | "near";
}

export const wallet = new Wallet({
    createAccessKeyFor: "registry.i-am-human.near",
})

const sdk = new CubidSDK(process.env.NEXT_PUBLIC_DAPP_ID, process.env.NEXT_PUBLIC_API_KEY);


wallet.startUp()

export const WalletComponent = (props: WalletComp) => {
    const inEvm = props.type === "evm";
    const [walletState, setWalletState] = useState(null)
    const { user, setUser } = useAuth()
    const [sdkResponse, setSdkResponse] = useState<any>(null);
    const [loading, setLoading] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const wallet_data = (wallet as any).accountId
            if (wallet_data) {
                setWalletState(wallet_data)
            }
        })()
    }, [])

    const createUser = useCallback(async () => {
        if (user) {
            setLoading('createUser');
            try {
                const response = await sdk.createUser({ email: user.email, phone: '' });
                const newUuid = response.user_id;
                setUser({ ...user, uuid: newUuid });
                setSdkResponse(response);
                localStorage.setItem('user_uuid', newUuid);
            } catch (error) {
                console.error("Error creating user:", error);
            } finally {
                setLoading(null);
            }
        }
    }, [])

    useEffect(() => {
        createUser()
    }, [createUser])

    function downloadTextFile(text, filename = 'download.txt') {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }


    return (
        <div className="w-full mx-auto bg-black rounded-2xl p-6 shadow-2xl shadow-purple-500/10 border border-white/20">
            <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {inEvm ? "EVM Wallets" : "NEAR Protocol"}
                </h2>

                {inEvm ? (
                    <div className="group relative">
                        <ConnectButton />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <button
                            onClick={() => wallet.signIn()}
                            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-0.5"
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-800">
                                    Connect NEAR Wallet
                                </span>
                            </div>
                        </button>

                        {walletState && (
                            <div className="p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
                                <span className="font-mono text-sm text-emerald-700">
                                    {walletState}
                                </span>
                                <QrCodeIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                        )}
                    </div>
                )}

                {/* Create Account Button */}
                <button onClick={async () => {
                    const { user_shares, public_address } = await sdk.encryptPrivateKey({ user_id: user.uuid })
                    const { data } = await supabase.from("accounts").insert({
                        public_key: public_address,
                        user_email: user.email
                    }).select('*')
                    await supabase.from("shamir_shares").insert({
                        app_share: user_shares?.[0],
                        account_id: data?.[0]?.id
                    })
                    downloadTextFile(user_shares?.[1], 'shameer_share.txt')
                }} className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-blue-500/20">
                    Create New On-Chain Account
                </button>
            </div>
        </div>
    )
}