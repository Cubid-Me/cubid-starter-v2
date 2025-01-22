import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const useAuth = () => {
    const [user, setUser] = useState(null)
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
    return { user, setUser }
}