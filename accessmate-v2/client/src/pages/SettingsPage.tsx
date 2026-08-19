import AccessMateShell from "@/components/AccessMateShell";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Languages, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const languages = ["English", "Telugu", "Hindi"] as const;
type Language = (typeof languages)[number];

export default function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const [language, setLanguage] = useState<Language>("English");
  const languageQuery = trpc.preferences.getLanguage.useQuery(undefined, { enabled: isAuthenticated });
  const saveLanguage = trpc.preferences.setLanguage.useMutation({ onSuccess: data => { setLanguage(data.language); toast.success("Language preference saved."); }, onError: error => toast.error(error.message) });

  useEffect(() => {
    if (languageQuery.data?.language) setLanguage(languageQuery.data.language);
  }, [languageQuery.data?.language]);

  return (
    <AccessMateShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><p className="text-sm font-bold uppercase tracking-[0.13em] text-[#0D9488]">Workspace preferences</p><h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-[#1E3A5F]">Settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#617387] sm:text-base">Choose the language you prefer for your AccessMate experience.</p>
        <section className="mt-8 rounded-2xl border border-[#dbe5e8] bg-white p-5 shadow-[0_10px_28px_rgba(30,58,95,0.05)] sm:p-7"><div className="flex items-start gap-4"><span className="grid size-11 place-items-center rounded-xl bg-[#E8F6F4] text-[#0D9488]"><Languages className="size-5" aria-hidden="true" /></span><div><h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#1E3A5F]">Preferred language</h2><p className="mt-1 text-sm leading-6 text-[#617387]">Your selection is saved to your account.</p></div></div>
          {!isAuthenticated ? <div className="mt-7 rounded-xl bg-[#F4F7F9] p-5"><p className="text-sm leading-6 text-[#617387]">Sign in to persist a language preference for your account.</p><Button onClick={() => startLogin()} className="mt-4 rounded-lg bg-[#1E3A5F] font-bold text-white hover:bg-[#17324E]">Sign in to continue</Button></div> : languageQuery.isLoading ? <div className="mt-7 flex min-h-30 items-center justify-center rounded-xl bg-[#F4F7F9] text-sm font-bold text-[#617387]"><LoaderCircle className="mr-2 size-4 animate-spin text-[#0D9488]" /> Loading preference</div> : languageQuery.error ? <div className="mt-7 rounded-xl border border-[#f4c6c2] bg-[#fff5f4] p-4 text-sm text-[#9f2d25]">{languageQuery.error.message}</div> : <><fieldset className="mt-7 grid gap-3 sm:grid-cols-3"><legend className="sr-only">Preferred language</legend>{languages.map(option => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${language === option ? "border-[#0D9488] bg-[#edf8f6]" : "border-[#dbe5e8] hover:border-[#96cfc8]"}`}><input type="radio" name="language" value={option} checked={language === option} onChange={() => setLanguage(option)} className="size-4 accent-[#0D9488]" /><span className="font-bold text-[#1E3A5F]">{option}</span></label>)}</fieldset><div className="mt-7 flex flex-col gap-3 border-t border-[#edf2f3] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#617387]">Current selection: <span className="font-bold text-[#1E3A5F]">{language}</span></p><Button onClick={() => saveLanguage.mutate({ language })} disabled={saveLanguage.isPending} className="rounded-lg bg-[#1E3A5F] px-5 font-bold text-white hover:bg-[#17324E]">{saveLanguage.isPending ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Saving</> : <><CheckCircle2 className="mr-2 size-4" /> Save preference</>}</Button></div></>}</section>
      </main>
    </AccessMateShell>
  );
}
