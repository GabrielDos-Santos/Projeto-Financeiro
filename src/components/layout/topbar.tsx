"use client";

import { usePathname } from "next/navigation";
import { Moon, Search, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationsPopover } from "@/features/notifications/components/notifications-popover";
import { COMMAND_PALETTE_OPEN_EVENT } from "./command-palette";
import { useTheme } from "./theme-provider";
import { currentSectionLabel } from "./nav-items";
import { UserMenu, type SessionUser } from "./user-menu";

export function Topbar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const section = currentSectionLabel(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="hidden text-sm text-muted-foreground md:inline">
          Zeno
        </span>
        {section && (
          <>
            <span className="hidden text-sm text-muted-foreground md:inline">
              /
            </span>
            <h1 className="truncate text-sm font-semibold">{section}</h1>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Pesquisar (Ctrl+K)"
          onClick={() =>
            window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT))
          }
        >
          <Search className="size-4" aria-hidden />
        </Button>
        <NotificationsPopover />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
          }
        >
          {theme === "dark" ? (
            <Sun className="size-4" aria-hidden />
          ) : (
            <Moon className="size-4" aria-hidden />
          )}
        </Button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
