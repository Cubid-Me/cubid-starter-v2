// @ts-nocheck
'use client'
import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CubidSDK, CubidWidget } from 'cubid-sdk';
import { WalletComponent } from "@/components/wallet";
import { WebAuthnCrypto } from "@/lib/webAuthnEncypt";

// Initialize the SDK with environment variables
const sdk = new CubidSDK(process.env.NEXT_PUBLIC_DAPP_ID, process.env.NEXT_PUBLIC_API_KEY);
const WebAuthN = new WebAuthnCrypto();

// Custom CSS for tooltips that work with disabled buttons
const tooltipStyles = `
  .tooltip-wrapper {
    position: relative;
  }

  .tooltip-wrapper[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    white-space: nowrap;
    z-index: 1000;
  }

  .tooltip-wrapper[data-tooltip]:hover::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    z-index: 1000;
  }
`;

export default function HomePage() {
    // State management
    const [user, setUser] = useState<any>(null);
    const [sdkResponse, setSdkResponse] = useState<any>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('sdkFunctions');

    // Inject tooltip styles when component mounts
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = tooltipStyles;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Authentication state management
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    const savedUuid = localStorage.getItem('user_uuid');
                    setUser({ ...session.user, uuid: savedUuid });

                    // Handle routing
                    const currentPath = window.location.pathname;
                    if (['/login', '/', '/signup'].includes(currentPath)) {
                        window.location.href = '/home';
                    }
                } else {
                    window.location.href = "/login";
                }
            }
        );

        return () => subscription?.unsubscribe();
    }, []);

    // Logout handler
    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('user_uuid');
        window.location.href = "/login";
    };

    // SDK Function Handlers
    const createUser = async () => {
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
    };

    const fetchApproxLocation = async () => {
        if (user?.uuid) {
            setLoading('fetchApproxLocation');
            try {
                const response = await sdk.fetchApproxLocation({ user_id: user.uuid });
                setSdkResponse(response);
            } catch (error) {
                console.error("Error fetching approximate location:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    const fetchExactLocation = async () => {
        if (user?.uuid) {
            setLoading('fetchExactLocation');
            try {
                const response = await sdk.fetchExactLocation({ user_id: user.uuid });
                setSdkResponse(response);
            } catch (error) {
                console.error("Error fetching exact location:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    const fetchIdentity = async () => {
        if (user?.uuid) {
            setLoading('fetchIdentity');
            try {
                const response = await sdk.fetchIdentity({ user_id: user.uuid });
                setSdkResponse(response);
            } catch (error) {
                console.error("Error fetching identity:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    const fetchRoughLocation = async () => {
        if (user?.uuid) {
            setLoading('fetchRoughLocation');
            try {
                const response = await sdk.fetchRoughLocation({ user_id: user.uuid });
                setSdkResponse(response);
            } catch (error) {
                console.error("Error fetching rough location:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    const fetchUserData = async () => {
        if (user?.uuid) {
            setLoading('fetchUserData');
            try {
                const response = await sdk.fetchUserData({ user_id: user.uuid });
                setSdkResponse(response);
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    const fetchScore = async () => {
        if (user?.uuid) {
            setLoading('fetchScore');
            try {
                const response = await sdk.fetchScore({ user_id: user.uuid });
                setSdkResponse(response);
            } catch (error) {
                console.error("Error fetching score:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    const sameer_secret_func = async () => {
        if (user?.uuid) {
            setLoading('sameer_secret');
            try {
                const response = await sdk.encryptPrivateKey({ user_id: user.uuid });
                setSdkResponse(response);
                const { } = await supabase.from("")

            } catch (error) {
                console.error("Error in secret function:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header Section */}
            <header className="w-full p-6 flex justify-between items-center bg-transparent backdrop-blur-lg">
                <h1 className="text-3xl font-bold text-white">Cubid App</h1>
                <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white/20 text-black font-bold transition-all duration-300 px-6 py-2 rounded-full"
                    onClick={handleLogout}
                >
                    Logout
                </Button>
            </header>

            {/* Tab Navigation */}
            <div className="flex justify-center space-x-4 mt-4">
                <Button
                    variant="default"
                    className={`px-4 py-2 rounded-lg ${activeTab === 'sdkFunctions' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white'}`}
                    onClick={() => setActiveTab('sdkFunctions')}
                >
                    SDK Functions
                </Button>
                {/* Conditional rendering for wallet tab */}
                {!user?.uuid ? (
                    <div className="tooltip-wrapper" data-tooltip="Please create user first">
                        <Button
                            variant="default"
                            className={`px-4 py-2 rounded-lg ${activeTab === 'wallet' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white'}`}
                            disabled={true}
                        >
                            Wallet
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="default"
                        className={`px-4 py-2 rounded-lg ${activeTab === 'wallet' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white'}`}
                        onClick={() => setActiveTab('wallet')}
                        disabled={loading !== null}
                    >
                        Wallet
                    </Button>
                )}
                {/* Conditional rendering for widgets tab */}
                {!user?.uuid ? (
                    <div className="tooltip-wrapper" data-tooltip="Please create user first">
                        <Button
                            variant="default"
                            className={`px-4 py-2 rounded-lg ${activeTab === 'widgets' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white'}`}
                            disabled={true}
                        >
                            Widgets
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="default"
                        className={`px-4 py-2 rounded-lg ${activeTab === 'widgets' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white'}`}
                        onClick={() => setActiveTab('widgets')}
                        disabled={loading !== null}
                    >
                        Widgets
                    </Button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col items-center justify-center flex-grow">
                {/* SDK Functions Tab */}
                {activeTab === 'sdkFunctions' && (
                    <Card className="w-full max-w-xl mt-10 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
                        <CardHeader>
                            <CardTitle className="text-4xl font-extrabold text-white">
                                Welcome
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center mt-4">
                            <p className="text-lg text-white/90 mb-6">
                                {user ? `Hello, ${user.email}` : "Loading..."}
                            </p>
                            <a className="text-lg text-blue-500 mb-6" href="https://admin.cubid.me/" target="_blank">
                                Link To Cubid Admin For API Keys
                            </a>

                            {/* Create User Button - Always visible */}
                            <Button
                                variant="default"
                                className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={createUser}
                                disabled={loading !== null}
                            >
                                {loading === 'createUser' ? 'Creating User...' : 'Create User'}
                            </Button>

                            {/* SDK Function Buttons with Conditional Tooltips */}
                            {/* Each button is conditionally rendered based on user.uuid */}
                            {!user?.uuid ? (
                                <div className="tooltip-wrapper" data-tooltip="Please create user first">
                                    <Button
                                        variant="default"
                                        className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                        onClick={sameer_secret_func}
                                        disabled={true}
                                    >
                                        Sameer Secret Sharing
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                    onClick={sameer_secret_func}
                                    disabled={loading !== null}
                                >
                                    {loading === 'sameer_secret' ? 'Processing...' : 'Sameer Secret Sharing'}
                                </Button>
                            )}

                            {!user?.uuid ? (
                                <div className="tooltip-wrapper" data-tooltip="Please create user first">
                                    <Button
                                        variant="default"
                                        className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                        onClick={fetchUserData}
                                        disabled={true}
                                    >
                                        Fetch User Data
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                    onClick={fetchUserData}
                                    disabled={loading !== null}
                                >
                                    {loading === 'fetchUserData' ? 'Loading...' : 'Fetch User Data'}
                                </Button>
                            )}

                            {!user?.uuid ? (
                                <div className="tooltip-wrapper" data-tooltip="Please create user first">
                                    <Button
                                        variant="default"
                                        className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                        onClick={fetchIdentity}
                                        disabled={true}
                                    >
                                        Fetch Identity
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                    onClick={fetchIdentity}
                                    disabled={loading !== null}
                                >
                                    {loading === 'fetchIdentity' ? 'Loading...' : 'Fetch Identity'}
                                </Button>
                            )}

                            {!user?.uuid ? (
                                <div className="tooltip-wrapper" data-tooltip="Please create user first">
                                    <Button
                                        variant="default"
                                        className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                        onClick={fetchScore}
                                        disabled={true}
                                    >
                                        Fetch Score
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                    onClick={fetchScore}
                                    disabled={loading !== null}
                                >
                                    {loading === 'fetchScore' ? 'Loading...' : 'Fetch Score'}
                                </Button>
                            )}

                            {!user?.uuid ? (
                                <div className="tooltip-wrapper" data-tooltip="Please create user first">
                                    <Button
                                        variant="default"
                                        className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                        onClick={fetchRoughLocation}
                                        disabled={true}
                                    >
                                        Fetch Rough Location
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                    onClick={fetchRoughLocation}
                                    disabled={loading !== null}
                                >
                                    {loading === 'fetchRoughLocation' ? 'Loading...' : 'Fetch Rough Location'}
                                </Button>
                            )}

                            {!user?.uuid ? (
                                <div className="tooltip-wrapper" data-tooltip="Please create user first">
                                    <Button
                                        variant="default"
                                        className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                        onClick={fetchApproxLocation}
                                        disabled={true}
                                    >
                                        Fetch Approx Location
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                    onClick={fetchApproxLocation}
                                    disabled={loading !== null}
                                >
                                    {loading === 'fetchApproxLocation' ? 'Loading...' : 'Fetch Approx Location'}
                                </Button>
                            )}

                            {!user?.uuid ? (
                                <div className="tooltip-wrapper" data-tooltip="Please create user first">
                                    <Button
                                        variant="default"
                                        className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                        onClick={fetchExactLocation}
                                        disabled={true}
                                    >
                                        Fetch Exact Location
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-80 py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                    onClick={fetchExactLocation}
                                    disabled={loading !== null}
                                >
                                    {loading === 'fetchExactLocation' ? 'Loading...' : 'Fetch Exact Location'}
                                </Button>
                            )}

                            {/* Response Display Section */}
                            {sdkResponse && (
                                <div className="mt-4 bg-white/10 p-4 rounded-lg text-white w-full">
                                    <h2 className="text-xl font-bold mb-2">SDK Response:</h2>
                                    <pre className="whitespace-pre-wrap break-all text-sm">
                                        {JSON.stringify(sdkResponse, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Wallet Tab Content */}
                {activeTab === "wallet" && (
                    <Card className="w-full max-w-3xl mt-10 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
                        <CardHeader>
                            <CardTitle className="text-4xl font-extrabold text-white">
                                Wallet Connect Component
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center mt-4">
                            {/* Wallet Components */}
                            <div className="text-white grid grid-cols-1 gap-3 w-full">
                                <WalletComponent type="evm" />
                                <WalletComponent type="near" />
                            </div>

                            {/* Decrypt Button with Tooltip */}
                            <div className="tooltip-wrapper w-full" data-tooltip={!user?.uuid ? "Please create user first" : ""}>
                                <button
                                    onClick={async () => {
                                        const auth = await WebAuthN.decryptDeviceShare();
                                        console.log({ auth });
                                    }}
                                    className="w-full text-center mt-5 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 
                                             transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-0.5 
                                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
                                    disabled={!user?.uuid}
                                >
                                    Decrypt Private Key
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Widgets Tab Content */}
                {activeTab === 'widgets' && (
                    <Card className="w-full max-w-3xl mt-10 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
                        <CardHeader>
                            <CardTitle className="text-4xl font-extrabold text-white">
                                Widgets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center mt-4">
                            {/* Social Media Widgets Grid */}
                            <div className="text-white grid grid-cols-2 gap-3 w-full">
                                {/* Google Widget */}
                                <CubidWidget
                                    stampToRender="google"
                                    uuid={user?.uuid}
                                    page_id="35"
                                    api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""}
                                />

                                {/* Twitter Widget */}
                                <CubidWidget
                                    stampToRender="twitter"
                                    uuid={user?.uuid}
                                    page_id="35"
                                    api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""}
                                />

                                {/* Discord Widget */}
                                <CubidWidget
                                    stampToRender="discord"
                                    uuid={user?.uuid}
                                    page_id="35"
                                    api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""}
                                />

                                {/* GitHub Widget */}
                                <CubidWidget
                                    stampToRender="github"
                                    uuid={user?.uuid}
                                    page_id="35"
                                    api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""}
                                />

                                {/* Facebook Widget */}
                                <CubidWidget
                                    stampToRender="facebook"
                                    uuid={user?.uuid}
                                    page_id="35"
                                    api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}