import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Adventure } from '../types';

export const useAdmin = () => {
    const [adminPassword, setAdminPassword] = useState('');
    const [adminAdventures, setAdminAdventures] = useState<Adventure[]>([]);
    const [featuredAdventures, setFeaturedAdventures] = useState<Adventure[]>([]);
    const [adminLoading, setAdminLoading] = useState(false);
    const [googleImageCount, setGoogleImageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const loadFeatured = async () => {
            const { data } = await supabase
                .from('adventures')
                .select('id, topic, audience, config, play_count, thumbnail_url, questions') // Adding questions as sometimes used in launch
                .eq('is_featured', true)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) setFeaturedAdventures(data as any);
        };
        loadFeatured();
    }, []);

    const fetchAdminAdventures = async (page = 0) => {
        setAdminLoading(true);
        const start = page * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE - 1;

        // Get Total Count first
        const { count } = await supabase.from('adventures').select('*', { count: 'exact', head: true });
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));

        // Get Lightweight Data
        const { data, error } = await supabase
            .from('adventures')
            .select('id, created_at, topic, audience, config, play_count, total_score, completions, is_featured, thumbnail_url, daily_plays, user_id')
            .order('created_at', { ascending: false })
            .range(start, end);

        if (data) {
            setAdminAdventures(data as any || []);
            setCurrentPage(page);
        }

        // Fetch Daily Stats
        const today = new Date().toISOString().split('T')[0];
        const { data: stats } = await supabase
            .from('daily_stats')
            .select('image_count')
            .eq('date', today)
            .single();
        setGoogleImageCount(stats?.image_count || 0);

        setAdminLoading(false);
        return error; // Return error for toast handling
    };

    const toggleFeatured = async (id: string, currentVal: boolean) => {
        setAdminAdventures(prev => prev.map(a => a.id === id ? { ...a, is_featured: !currentVal } : a));
        await supabase.from('adventures').update({ is_featured: !currentVal }).eq('id', id);
    };

    const deleteAdventure = async (id: string) => {
        setAdminAdventures(prev => prev.filter(a => a.id !== id));
        await supabase.from('adventures').delete().eq('id', id);
    };

    // --- Engagement Stats ---
    const totalPlays = adminAdventures.reduce((acc, curr) => acc + (curr.play_count || 0), 0);
    const totalCompletions = adminAdventures.reduce((acc, curr) => acc + (curr.completions || 0), 0);
    const totalScoreVal = adminAdventures.reduce((acc, curr) => acc + (curr.total_score || 0), 0);
    const completionRate = totalPlays > 0 ? Math.round((totalCompletions / totalPlays) * 100) : 0;
    const globalAvgScore = totalCompletions > 0 ? Math.round(totalScoreVal / totalCompletions) : 0;

    return {
        adminPassword, setAdminPassword,
        adminAdventures, setAdminAdventures,
        featuredAdventures, setFeaturedAdventures,
        adminLoading, setAdminLoading,
        googleImageCount, setGoogleImageCount,
        currentPage, setCurrentPage,
        totalPages, setTotalPages,
        totalPlays,
        completionRate,
        globalAvgScore,
        fetchAdminAdventures,
        toggleFeatured,
        deleteAdventure
    };
};
