import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnvValue } from '../utils.ts';
import { SUPABASE_KEY as FALLBACK_KEY, SUPABASE_URL as FALLBACK_URL } from '../supabaseCredentials.ts';

const resolveCredential = (key: string, fallback: string): string => {
    const envValue =
        getEnvValue(key) ??
        (key === 'SUPABASE_URL' ? getEnvValue('SUPABASE_PROJECT_URL') : undefined) ??
        (key === 'SUPABASE_KEY' ? getEnvValue('SUPABASE_ANON_KEY') : undefined);
    return envValue ?? fallback ?? '';
};

const SUPABASE_URL = resolveCredential('SUPABASE_URL', FALLBACK_URL);
const SUPABASE_KEY = resolveCredential('SUPABASE_KEY', FALLBACK_KEY);

const PLACEHOLDER_PATTERNS = [
    /ここに/i,
    /example\.supabase\.co/i,
    /your[-_ ]?supabase/i,
    /^$/,
];

const isPlaceholder = (value: string | undefined | null): boolean => {
    if (!value) return true;
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
};

const credentialsConfigured = !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_KEY);

let supabaseInstance: SupabaseClient | null = null;

if (credentialsConfigured) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
        },
    });
} else if (typeof console !== 'undefined' && console.warn) {
    console.warn('Supabase credentials are not configured. Running in demo mode.');
}

export const supabase = supabaseInstance;

export const getSupabase = (): SupabaseClient => {
    if (!supabaseInstance) {
        throw new Error('Supabase client is not initialized. Please configure credentials in supabaseCredentials.ts or environment variables.');
    }
    return supabaseInstance;
};

export const hasSupabaseCredentials = (): boolean => credentialsConfigured;