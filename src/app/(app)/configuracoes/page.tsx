import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProfile, getSettings } from "@/features/settings/queries";
import { BackupSection } from "@/features/settings/components/backup-section";
import { DangerZone } from "@/features/settings/components/danger-zone";
import { PasswordForm } from "@/features/settings/components/password-form";
import { PreferencesForm } from "@/features/settings/components/preferences-form";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  if (!profile || !settings) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Perfil, preferências, segurança e dados da sua conta."
      />
      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>
        <TabsContent value="perfil" className="mt-4">
          <ProfileForm profile={profile} />
        </TabsContent>
        <TabsContent value="preferencias" className="mt-4">
          <PreferencesForm settings={settings} />
        </TabsContent>
        <TabsContent value="seguranca" className="mt-4">
          <PasswordForm />
        </TabsContent>
        <TabsContent value="dados" className="mt-4 flex flex-col gap-4">
          <BackupSection />
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
