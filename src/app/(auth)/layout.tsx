import Link from "next/link";
import { Wallet } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 self-center font-semibold"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border bg-card text-card-foreground">
            <Wallet className="size-4" aria-hidden />
          </span>
          FinApp
        </Link>
        {children}
      </div>
    </div>
  );
}
