import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/** Client do browser — usa apenas a anon key (RLS protege os dados). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
