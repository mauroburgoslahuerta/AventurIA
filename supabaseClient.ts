/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing. Share features will be disabled.");
    console.log("--> USING MOCK SUPABASE CLIENT (No credentials found) <--");
} else {
    console.log("--> USING REAL SUPABASE CLIENT <--");
    // console.log("Supabase URL loaded:", supabaseUrl); // Optional debug
}

const mockFrom = () => {
    const chain: any = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        delete: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        range: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        // Make it awaitable like a PostgrestBuilder
        then: (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled),
        catch: (onrejected: any) => Promise.resolve({ data: [], error: null }).catch(onrejected),
    };
    return chain;
};

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        from: mockFrom,
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: (callback: any) => {
                // Return a dummy unsubscribe object
                return { data: { subscription: { unsubscribe: () => { } } } };
            },
            signOut: () => Promise.resolve({ error: null }),
            signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
            signUp: () => Promise.resolve({ data: { user: null }, error: null }),
        },
        storage: {
            from: () => ({
                upload: () => Promise.resolve({ data: null, error: { message: "No credentials" } }),
                getPublicUrl: () => ({ data: { publicUrl: "" } })
            })
        },
        rpc: () => Promise.resolve({ data: null, error: null }),
        functions: {
            invoke: () => Promise.resolve({ data: null, error: { message: "No credentials" } })
        }
    } as any;
