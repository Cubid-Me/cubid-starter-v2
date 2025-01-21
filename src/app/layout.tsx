'use client';
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig'; // Firebase config
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'cubid-sdk'

// Load custom fonts
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to authentication state change
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
        // Redirect logged-in users away from login/signup pages
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/' || currentPath === '/signup') {
          window.location.href = '/home'; // Redirect to home
        }
      } else {
        setAuthenticated(false);
        // Redirect non-authenticated users to login if on the home page
        if (window.location.pathname === '/home') {
          window.location.href = '/'; // Redirect to login or landing page
        }
      }
      setLoading(false);
    });

    // Cleanup the subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          <Provider>
            {children}
          </Provider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
