import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/nav/Sidebar";
import { MobileNav } from "@/components/nav/MobileNav";
import { LogoutButton } from "@/components/nav/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.name} userEmail={session.email} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-base-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 bg-base/80 backdrop-blur-md">
          <span className="md:hidden text-[15px] font-semibold text-ink">Attendly</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline text-[13px] text-ink-faint">{session.role === "ADMIN" ? "Administrator" : "Teacher"}</span>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
