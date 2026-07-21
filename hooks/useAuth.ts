import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useAuth = () => {
    const [user, setUser] = useState<any>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [showAuthOverlay, setShowAuthOverlay] = useState(false);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setCredits(null);
            return;
        }

        // Fetch initial credits
        const fetchCredits = async () => {
            const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
            if (data) setCredits(data.credits);
        };
        fetchCredits();

        // Listen for changes in profiles table (requires Supabase Realtime enabled for 'profiles')
        const channel = supabase.channel('public:profiles')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                (payload: any) => {
                    if (payload.new && typeof payload.new.credits === 'number') {
                        setCredits(payload.new.credits);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleLoginSuccess = (user: any) => {
        setUser(user);
        setShowAuthOverlay(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return {
        user,
        setUser, // Exposed if needed, but usually managed internally
        credits,
        setCredits,
        showAuthOverlay,
        setShowAuthOverlay,
        handleLoginSuccess,
        handleLogout
    };
};
