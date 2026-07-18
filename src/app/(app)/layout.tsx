import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // O middleware é UX; a revalidação de verdade acontece aqui,
  // em cada request do grupo (app) (ARQUITETURA.md §6).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const metadataName = user.user_metadata?.full_name;
  const name =
    (typeof metadataName === "string" && metadataName.trim()) ||
    user.email ||
    "Usuário";
  const email = user.email ?? "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={{ name, email, avatarUrl: profile?.avatar_url }} />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
