"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { applyFieldErrors } from "@/lib/form";
import { updateProfile } from "../actions";
import { profileFormSchema, type ProfileFormInput } from "../schemas";
import type { Profile } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url ?? "",
    },
  });

  const watchedName = form.watch("fullName");
  const watchedAvatar = form.watch("avatarUrl");

  function onSubmit(values: ProfileFormInput) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        applyFieldErrors(form, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Perfil atualizado.");
    });
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={watchedAvatar || undefined} alt="" />
                <AvatarFallback className="text-lg font-medium">
                  {initials(watchedName || profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>URL do avatar (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Aparece no menu do usuário e nos e-mails de auth.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
