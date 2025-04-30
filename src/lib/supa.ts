import { createClient } from '@supabase/supabase-js';

export const supa = createClient(
  import.meta.env.VITE_SUPA_URL!,
  import.meta.env.VITE_SUPA_KEY!
);
