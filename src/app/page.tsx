import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// O middleware já redireciona "/" conforme a sessão;
// este é o fallback server-side equivalente.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
