import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, FileText, LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents/new", label: "Upload PDF", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none">
      <span className="grid size-8 place-items-center rounded-lg bg-[#1E3A5F] text-white"><ShieldCheck className="size-4.5" aria-hidden="true" /></span>
      {!compact && <span className="text-[1rem] font-extrabold tracking-[-0.035em] text-[#1E3A5F]">AccessMate</span>}
    </Link>
  );
}

export default function AccessMateShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#19324D]">
      <header className="sticky top-0 z-40 border-b border-[#dce5eb] bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandMark />
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = location === href || (href === "/dashboard" && location.startsWith("/documents/"));
              return <Link key={href} href={href} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-[#e9f6f4] text-[#126b64]" : "text-[#5a6d80] hover:bg-[#f4f7f8] hover:text-[#1E3A5F]"}`}><Icon className="size-4" aria-hidden="true" />{label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            {!loading && isAuthenticated ? <><span className="hidden max-w-32 truncate text-sm font-semibold text-[#52677d] sm:inline">{user?.name || "Account"}</span><Button variant="ghost" size="sm" onClick={logout} className="gap-2 rounded-md text-[#52677d] hover:bg-[#f4f7f8] hover:text-[#1E3A5F]"><LogOut className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Sign out</span></Button></> : <Button size="sm" onClick={() => startLogin()} className="rounded-md bg-[#1E3A5F] px-4 font-bold text-white hover:bg-[#19324d]">Sign in</Button>}
          </div>
        </div>
        <nav aria-label="Mobile navigation" className="flex overflow-x-auto border-t border-[#edf1f3] px-3 py-2 md:hidden">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href === "/dashboard" && location.startsWith("/documents/"));
            return <Link key={href} href={href} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold ${active ? "bg-[#e9f6f4] text-[#126b64]" : "text-[#617387]"}`}><Icon className="size-3.5" aria-hidden="true" />{label}</Link>;
          })}
        </nav>
      </header>
      {children}
      <footer className="border-t border-[#dce5eb] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-[#6b7d8e] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div className="flex items-center gap-2"><BookOpenCheck className="size-4 text-[#0D9488]" aria-hidden="true" /> Making digital information easier to access.</div><span>AccessMate</span></div></footer>
    </div>
  );
}
