'use client';
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
// @ts-ignore
import { Provider } from 'cubid-sdk'

import '@rainbow-me/rainbowkit/styles.css';
import "@near-wallet-selector/modal-ui/styles.css"
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
} from 'wagmi/chains';

const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const isAuthenticated = !!session?.user;
        setAuthenticated(isAuthenticated);

        // Handle routing only on client side
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;

          if (isAuthenticated) {
            // Redirect authenticated users away from auth pages
            if (currentPath === '/login' || currentPath === '/' || currentPath === '/signup') {
              window.location.href = '/home';
            }
          } else {
            // Redirect unauthenticated users from protected routes
            if (currentPath === '/home') {
              window.location.href = '/';
            }
          }
        }
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => subscription?.unsubscribe();
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <Provider>
                {children}
              </Provider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}