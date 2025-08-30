// src/lib/store.ts

import { writable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';

/**
 * A writable store that holds the user's session.
 * Initialized to null (no user logged in).
 */
export const userSession = writable<Session | null>(null);