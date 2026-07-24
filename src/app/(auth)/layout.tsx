import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex flex-col items-center gap-3 self-center font-semibold"
        >
          <Image
            src="/icons/icon-192.png"
            alt="Zeno"
            width={56}
            height={56}
            priority
            className="rounded-2xl shadow-sm ring-1 ring-border"
          />
          <span className="text-lg tracking-tight">Zeno</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
