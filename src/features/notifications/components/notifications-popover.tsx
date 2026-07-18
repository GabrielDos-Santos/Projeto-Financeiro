"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

const NOTIFICATIONS_QUERY_KEY = ["notifications"];

export function NotificationsPopover() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const supabase = React.useMemo(() => createClient(), []);

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error("Falha ao carregar notificações.");
      return data;
    },
    // Sino não precisa ser tempo real; refetch ao focar a aba/abrir já basta.
    staleTime: 30_000,
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }
  }

  async function handleItemClick(id: string, readAt: string | null) {
    if (readAt) return;
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notificações (${unreadCount} não lidas)`
              : "Notificações"
          }
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-4 justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAll}
            >
              <CheckCheck className="size-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {query.isPending ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n.id, n.read_at)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      {!n.read_at && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-blue-500"
                          aria-hidden
                        />
                      )}
                      <span className="truncate text-sm font-medium">
                        {n.title}
                      </span>
                    </span>
                    {n.body && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
