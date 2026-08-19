import { BrandMark } from "@/components/AccessMateShell";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, FileSearch, Languages, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const principles = [
  { icon: FileSearch, title: "Readable document text", description: "Upload a PDF and review the extracted text in one focused workspace." },
  { icon: Languages, title: "Language-aware access", description: "Set English, Telugu, or Hindi as your preferred experience." },
  { icon: Sparkles, title: "Clear next steps", description: "Simplify, translate, listen, and ask questions about a document." },
];

export default function Home() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#19324D]">
      <header className="border-b border-[#dce5eb] bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><BrandMark /><Button onClick={() => setLocation("/dashboard")} className="rounded-md bg-[#1E3A5F] px-4 font-bold text-white hover:bg-[#19324d]">Sign in</Button></div></header>
      <main>
        <section className="border-b border-[#dce5eb] bg-white"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] md:items-center lg:px-8 lg:py-20"><div className="max-w-2xl"><div className="flex flex-wrap gap-2"><span className="rounded-md border border-[#cbe7e3] bg-[#f0faf8] px-2.5 py-1 text-xs font-bold text-[#126b64]">Social Impact &amp; Accessibility</span><span className="rounded-md border border-[#dce5eb] bg-[#f7f9fb] px-2.5 py-1 text-xs font-bold text-[#52677d]">AI &amp; ML</span></div><p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-[#0D9488]">AI-Powered Digital Accessibility Assistant</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-[#1E3A5F] sm:text-4xl">Making Digital Information Understandable and Accessible to Everyone</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#617387]">AccessMate turns complex PDF documents into a clearer, more approachable reading experience—without adding clutter to the task.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"><Button onClick={() => setLocation("/dashboard")} size="lg" className="h-11 rounded-md bg-[#0D9488] px-5 font-extrabold text-white hover:bg-[#0b756c]">Try AccessMate <ArrowRight className="ml-2 size-4" aria-hidden="true" /></Button><span className="flex items-center gap-2 text-sm text-[#617387]"><Check className="size-4 text-[#0D9488]" aria-hidden="true" /> Built for focused, inclusive workflows</span></div></div><aside className="rounded-xl border border-[#dce5eb] bg-[#f8fbfc] p-6"><p className="text-sm font-bold text-[#1E3A5F]">A simpler document workflow</p><div className="mt-5 space-y-4">{["Upload a text-based PDF", "Review extracted content", "Use the tools you need"].map((item, index) => <div key={item} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full bg-[#e9f6f4] text-xs font-extrabold text-[#126b64]">{index + 1}</span><span className="text-sm font-medium text-[#52677d]">{item}</span></div>)}</div></aside></div></section>
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="grid gap-4 md:grid-cols-3">{principles.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-xl border border-[#dce5eb] bg-white p-5"><span className="grid size-9 place-items-center rounded-lg bg-[#e9f6f4] text-[#0D9488]"><Icon className="size-4.5" aria-hidden="true" /></span><h2 className="mt-4 text-base font-extrabold text-[#1E3A5F]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#617387]">{description}</p></article>)}</div></section>
      </main>
    </div>
  );
}
