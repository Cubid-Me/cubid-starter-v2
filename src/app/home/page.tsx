// pages/index.js
'use client'
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebaseConfig"; // Firebase config file
import { onAuthStateChanged, signOut } from "firebase/auth"; // Firebase methods
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation"; // For navigation
import { CubidSDK } from 'cubid-sdk'

const sdk = new CubidSDK(process.env.NEXT_PUBLIC_DAPP_ID, process.env.NEXT_PUBLIC_API_KEY)

export default function HomePage() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const [sdkResponse, setSdkResponse] = useState<any>(null); // To store responses from SDK functions


    // Check for the logged-in user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                window.location.href = "/login"; // Redirect to login if no user
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = "/login"; // Use native navigation
    };


    // Example SDK function calls
    const fetchUserData = async () => {
        if (user) {
            try {
                const response = await sdk.fetchUserData({ user_id: user.uid });
                setSdkResponse(response); // Set the response to display
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        }
    };

    const fetchApproxLocation = async () => {
        if (user) {
            try {
                const response = await sdk.fetchApproxLocation({ user_id: user.uid });
                setSdkResponse(response);
            } catch (error) {
                console.error("Error fetching approximate location:", error);
            }
        }
    };

    const createUser = async () => {
        if (user) {
            try {
                const response = await sdk.createUser({ email: user.email, phone: '' });
                setUser({ ...user, uid: response.user_id })
                setSdkResponse(response);
            } catch (error) {
                console.error("Error creating user:", error);
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

            {/* Main Content */}
            <div className="flex flex-col items-center justify-center flex-grow">
                {/* Glassy Welcome Card */}
                <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
                    <CardHeader>
                        <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-500 to-pink-500">
                            Welcome
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center mt-4">
                        <p className="text-lg text-white/90 mb-6">
                            {user ? `Hello, ${user.email}` : "Loading..."}
                        </p>
                        <Button
                            variant="default"
                            className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                            onClick={fetchUserData}
                        >
                            Fetch User Data
                        </Button>
                        <Button
                            variant="default"
                            className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                            onClick={fetchApproxLocation}
                        >
                            Fetch Approx Location
                        </Button>
                        <Button
                            variant="default"
                            className="w-full py-3 mb-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                            onClick={createUser}
                        >
                            Create User
                        </Button>

                        {/* Display SDK Response */}
                        {sdkResponse && (
                            <div className="mt-4 bg-white/10 p-4 rounded-lg text-white">
                                <h2 className="text-xl font-bold">SDK Response:</h2>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(sdkResponse, null, 2)}</pre>
                            </div>
                        )}
                    </CardContent>
                    <CardContent className="flex flex-col items-center mt-4">
                        <p className="text-lg text-white/90 mb-6">
                            {user ? `Hello, ${user.email}` : "Loading..."}
                        </p>
                        <Button
                            variant="default"
                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all duration-300"
                            onClick={handleLogout}
                        >
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
