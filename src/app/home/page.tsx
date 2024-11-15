'use client'
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebaseConfig"; // Firebase config file
import { onAuthStateChanged, signOut } from "firebase/auth"; // Firebase methods
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CubidSDK, CubidWidget } from 'cubid-sdk';

// Initialize the SDK
const sdk = new CubidSDK(process.env.NEXT_PUBLIC_DAPP_ID, process.env.NEXT_PUBLIC_API_KEY);

export default function HomePage() {
    const [user, setUser] = useState<any>(null);
    const [sdkResponse, setSdkResponse] = useState<any>(null); // To store responses from SDK functions
    const [loading, setLoading] = useState<string | null>(null); // To manage loading state for API calls
    const [activeTab, setActiveTab] = useState('sdkFunctions'); // To manage active tab

    // Check for the logged-in user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // Load UUID from localStorage if available
                const savedUuid = localStorage.getItem('user_uuid');
                setUser({ ...currentUser, uuid: savedUuid });
            } else {
                window.location.href = "/login"; // Redirect to login if no user
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem('user_uuid'); // Remove UUID from localStorage
        window.location.href = "/login"; // Use native navigation
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
                localStorage.setItem('user_uuid', newUuid); // Save UUID to localStorage
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

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
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
                    className={`px-4 py-2 rounded-lg ${activeTab === 'sdkFunctions' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white'
                        }`}
                    onClick={() => setActiveTab('sdkFunctions')}
                >
                    SDK Functions
                </Button>
                <Button
                    variant="default"
                    className={`px-4 py-2 rounded-lg ${activeTab === 'widgets' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white'
                        }`}
                    disabled={!user?.uuid || loading !== null}
                    onClick={() => setActiveTab('widgets')}
                >
                    Widgets
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex flex-col items-center justify-center flex-grow">
                {activeTab === 'sdkFunctions' && (
                    <Card className="w-full max-w-xl  mt-10 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
                        <CardHeader>
                            <CardTitle className="text-4xl font-extrabold text-white">
                                Welcome
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center mt-4">
                            <p className="text-lg text-white/90 mb-6">
                                {user ? `Hello, ${user.email}` : "Loading..."}
                            </p>
                            <a className="text-lg text-blue-500 mb-6"  href="https://admin.cubid.me/" target="_blank">Link To Cubid Admin For API Keys</a>
                            {/* SDK Function Buttons */}
                            <Button
                                variant="default"
                                className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={createUser}
                                disabled={loading !== null}
                            >
                                {loading === 'createUser' ? 'Creating User...' : 'Create User'}
                            </Button>
                            <Button
                                variant="default"
                                className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={fetchUserData}
                                disabled={!user?.uuid || loading !== null}
                            >
                                {loading === 'fetchUserData' ? 'Loading...' : 'Fetch User Data'}
                            </Button>
                            <Button
                                variant="default"
                                className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={fetchIdentity}
                                disabled={!user?.uuid || loading !== null}
                            >
                                {loading === 'fetchIdentity' ? 'Loading...' : 'Fetch Identity'}
                            </Button>
                            <Button
                                variant="default"
                                className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={fetchScore}
                                disabled={!user?.uuid || loading !== null}
                            >
                                {loading === 'fetchScore' ? 'Loading...' : 'Fetch Score'}
                            </Button>
                            <Button
                                variant="default"
                                className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={fetchRoughLocation}
                                disabled={!user?.uuid || loading !== null}
                            >
                                {loading === 'fetchRoughLocation' ? 'Loading...' : 'Fetch Rough Location'}
                            </Button>

                            <Button
                                variant="default"
                                className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={fetchApproxLocation}
                                disabled={!user?.uuid || loading !== null}
                            >
                                {loading === 'fetchApproxLocation' ? 'Loading...' : 'Fetch Approx Location'}
                            </Button>
                            <Button
                                variant="default"
                                className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                                onClick={fetchExactLocation}
                                disabled={!user?.uuid || loading !== null}
                            >
                                {loading === 'fetchExactLocation' ? 'Loading...' : 'Fetch Exact Location'}
                            </Button>




                            {/* Display SDK Response */}
                            {sdkResponse && (
                                <div className="mt-4 bg-white/10 p-4 rounded-lg text-white">
                                    <h2 className="text-xl font-bold">SDK Response:</h2>
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(sdkResponse, null, 2)}</pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'widgets' && (
                    <Card className="w-full max-w-3xl mt-10 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
                        <CardHeader>
                            <CardTitle className="text-4xl font-extrabold text-white">
                                Widgets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center mt-4">
                            <div className="text-white grid grid-cols-3 gap-3">
                                <CubidWidget stampToRender="google" uuid={user?.uuid} page_id="35" api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""} />
                                <CubidWidget stampToRender="twitter" uuid={user?.uuid} page_id="35" api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""} />
                                <CubidWidget stampToRender="discord" uuid={user?.uuid} page_id="35" api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""} />
                                <CubidWidget stampToRender="github" uuid={user?.uuid} page_id="35" api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""} />
                                <CubidWidget stampToRender="facebook" uuid={user?.uuid} page_id="35" api_key={process.env.NEXT_PUBLIC_API_KEY ?? ""} />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
