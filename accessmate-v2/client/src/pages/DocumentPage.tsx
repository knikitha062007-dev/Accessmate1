import AccessMateShell from "@/components/AccessMateShell";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MAX_DOCUMENT_SIZE_BYTES, formatFileSize, readPdfAsBase64 } from "@/lib/documentUpload";
import { trpc } from "@/lib/trpc";
import { speakDocumentText, stopDocumentSpeech } from "@/lib/tts";
import { AlertCircle, CheckCircle2, ChevronLeft, ExternalLink, FileText, Headphones, Languages, LoaderCircle, RotateCcw, Send, UploadCloud, Volume2, WandSparkles } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const languages = ["English", "Telugu", "Hindi"] as const;
type Language = (typeof languages)[number];

const languageLocale: Record<Language, string> = { English: "en-US", Telugu: "te-IN", Hindi: "hi-IN" };

export default function DocumentPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/documents/:id");
  const documentId = params?.id && params.id !== "new" ? Number(params.id) : null;
  const { isAuthenticated } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<Language>("English");
  const [simplifiedText, setSimplifiedText] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"original" | "simplified" | "translation">("original");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const utils = trpc.useUtils();
  const documentQuery = trpc.documents.getById.useQuery({ id: documentId ?? 0 }, { enabled: isAuthenticated && documentId !== null });
  const preferenceQuery = trpc.preferences.getLanguage.useQuery(undefined, { enabled: isAuthenticated && documentId !== null });
  const uploadDocument = trpc.documents.upload.useMutation({
    onSuccess: document => {
      toast.success("PDF uploaded and text extracted.");
      utils.documents.list.invalidate();
      setLocation(`/documents/${document.id}`);
    },
    onError: error => toast.error(error.message),
  });
  const simplify = trpc.documents.simplify.useMutation({
    onSuccess: result => { setSimplifiedText(result.text); setTranslatedText(null); setDisplayMode("simplified"); toast.success("Text simplified."); },
    onError: error => toast.error(error.message),
  });
  const translate = trpc.documents.translate.useMutation({
    onSuccess: result => { setTranslatedText(result.text); setDisplayMode("translation"); toast.success(`Text translated to ${result.language}.`); },
    onError: error => toast.error(error.message),
  });
  const ask = trpc.documents.ask.useMutation({
    onSuccess: result => setAnswer(result.answer),
    onError: error => toast.error(error.message),
  });

  const document = documentQuery.data;
  const displayedText = useMemo(() => {
    if (!document) return "";
    if (displayMode === "translation" && translatedText) return translatedText;
    if (displayMode === "simplified" && simplifiedText) return simplifiedText;
    return document.extractedText;
  }, [document, displayMode, simplifiedText, translatedText]);

  useEffect(() => {
    if (preferenceQuery.data?.language) setLanguage(preferenceQuery.data.language);
  }, [preferenceQuery.data?.language]);

  useEffect(() => {
    setSimplifiedText(null);
    setTranslatedText(null);
    setDisplayMode("original");
    setQuestion("");
    setAnswer(null);
    stopDocumentSpeech();
    setIsListening(false);
  }, [document?.id]);

  useEffect(() => () => { stopDocumentSpeech(); }, []);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf") || (selected.type && selected.type !== "application/pdf")) {
      toast.error("Please select a PDF file.");
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_DOCUMENT_SIZE_BYTES) {
      toast.error("The PDF exceeds the 8 MB file-size limit.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  }

  async function uploadSelectedFile() {
    if (!file) return;
    try {
      const fileData = await readPdfAsBase64(file);
      uploadDocument.mutate({ fileName: file.name, mimeType: file.type || "application/pdf", fileData });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The PDF could not be read.");
    }
  }

  function listenToDisplayedText() {
    if (isListening) {
      stopDocumentSpeech();
      setIsListening(false);
      return;
    }
    const result = speakDocumentText(displayedText, languageLocale[language], {
      onEnd: () => { setIsListening(false); toast.success("Finished listening."); },
      onError: () => { setIsListening(false); toast.error("The browser could not read this text aloud."); },
    });
    if (!result.started) {
      toast.error(result.reason);
      return;
    }
    setIsListening(true);
    toast.success(`Reading the displayed text in ${language}.`);
  }

  function askQuestion() {
    if (!document || !question.trim()) {
      toast.error("Enter a question about this document.");
      return;
    }
    ask.mutate({ documentId: document.id, question: question.trim(), language });
  }

  const isNewDocument = documentId === null;
  const statusLabel = uploadDocument.isPending ? "Processing document" : document ? "Text extracted" : file ? "Ready to upload" : "Awaiting document";
  const isTextBusy = simplify.isPending || translate.isPending;

  return (
    <AccessMateShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <button onClick={() => setLocation("/dashboard")} className="inline-flex items-center gap-1.5 rounded-lg px-1 py-2 text-sm font-bold text-[#52677d] hover:text-[#1E3A5F]"><ChevronLeft className="size-4" aria-hidden="true" /> Back to dashboard</button>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.13em] text-[#0D9488]">Document workspace</p><h1 className="mt-1 truncate text-3xl font-extrabold tracking-[-0.04em] text-[#1E3A5F]">{document?.fileName || "Upload and review a PDF"}</h1></div><div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E8F6F4] px-3 py-1.5 text-xs font-bold text-[#0b756c]">{uploadDocument.isPending || documentQuery.isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}{statusLabel}</div></div>

        {!isAuthenticated ? (
          <section className="mt-7 rounded-2xl border border-[#dbe5e8] bg-white p-8 text-center shadow-[0_10px_28px_rgba(30,58,95,0.05)]"><h2 className="text-xl font-extrabold text-[#1E3A5F]">Sign in before uploading</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#617387]">Your document metadata and extracted text are linked to your private AccessMate account.</p><Button onClick={() => startLogin()} className="mt-5 rounded-lg bg-[#1E3A5F] font-bold text-white hover:bg-[#17324E]">Sign in to continue</Button></section>
        ) : documentQuery.error ? (
          <section className="mt-7 rounded-2xl border border-[#f4c6c2] bg-[#fff5f4] p-5 text-sm leading-6 text-[#9f2d25]">{documentQuery.error.message}</section>
        ) : isNewDocument ? (
          <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-2xl border border-[#dbe5e8] bg-white p-5 shadow-[0_10px_28px_rgba(30,58,95,0.05)] sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#E8F6F4] text-[#0D9488]"><UploadCloud className="size-5" aria-hidden="true" /></span><div><h2 className="font-extrabold text-[#1E3A5F]">PDF upload</h2><p className="text-sm text-[#617387]">Choose a text-based PDF to extract and review.</p></div></div><label htmlFor="document-upload" className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#b8cbcf] bg-[#f9fbfc] px-5 py-10 text-center hover:border-[#0D9488] hover:bg-[#f1fbf9]"><span className="grid size-12 place-items-center rounded-2xl bg-white text-[#1E3A5F] shadow-sm"><FileText className="size-6" aria-hidden="true" /></span><span className="mt-4 font-extrabold text-[#1E3A5F]">{file?.name || "Select a PDF file"}</span><span className="mt-1 text-sm text-[#617387]">PDF only · readable text · 8 MB maximum</span><input id="document-upload" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={selectFile} /></label><div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#dbe5e8] bg-[#F4F7F9] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-[#1E3A5F]">{file?.name || "No file selected"}</p><p className="mt-0.5 text-xs text-[#617387]">{file ? formatFileSize(file.size) : "The server validates type, size, content, and PDF structure."}</p></div><Button disabled={!file || uploadDocument.isPending} onClick={uploadSelectedFile} className="rounded-lg bg-[#0D9488] font-bold text-white hover:bg-[#0b756c] disabled:bg-[#9fc8c3]">{uploadDocument.isPending ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Extracting text</> : "Upload & Extract"}</Button></div></section>
            <aside className="rounded-2xl border border-[#dbe5e8] bg-white p-5 shadow-[0_10px_28px_rgba(30,58,95,0.05)] sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-[#fff6e6] text-[#b7791f]"><AlertCircle className="size-5" aria-hidden="true" /></span><h2 className="mt-4 font-extrabold text-[#1E3A5F]">Before you upload</h2><p className="mt-2 text-sm leading-6 text-[#617387]">AccessMate accepts PDFs with extractable text. A PDF that is empty, corrupt, overly large, or not actually a PDF will be safely rejected.</p></aside>
          </div>
        ) : document ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_0.6fr]">
            <article className="rounded-2xl border border-[#dbe5e8] bg-white p-5 shadow-[0_10px_28px_rgba(30,58,95,0.05)] sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0D9488]">{displayMode === "translation" ? `${language} translation` : displayMode === "simplified" ? "Simplified text" : "Extracted text"}</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-[#1E3A5F]">Text preview</h2></div><a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#c5d6d9] bg-white px-3 py-2 text-xs font-bold text-[#1E3A5F] hover:bg-[#E8F6F4]">Open PDF <ExternalLink className="size-3.5" aria-hidden="true" /></a></div>
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#dbe5e8] bg-[#f9fbfc] p-4 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm font-bold text-[#1E3A5F]"><Languages className="size-4 text-[#0D9488]" aria-hidden="true" /> Display language<select value={language} onChange={event => { setLanguage(event.target.value as Language); setTranslatedText(null); if (displayMode === "translation") setDisplayMode(simplifiedText ? "simplified" : "original"); }} className="rounded-lg border border-[#b8cbcf] bg-white px-2 py-1.5 text-sm font-semibold text-[#1E3A5F]">{languages.map(option => <option key={option} value={option}>{option}</option>)}</select></label><span className="text-xs text-[#617387]">Loaded from your saved preference</span></div>
              <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={isTextBusy} onClick={() => simplify.mutate({ documentId: document.id })} className="rounded-lg border-[#b8cbcf] bg-white font-bold text-[#1E3A5F] hover:bg-[#E8F6F4]"><WandSparkles className="mr-2 size-4 text-[#0D9488]" />{simplify.isPending ? "Simplifying" : "Simplify"}</Button><Button variant="outline" disabled={isTextBusy} onClick={() => translate.mutate({ documentId: document.id, text: displayedText, language })} className="rounded-lg border-[#b8cbcf] bg-white font-bold text-[#1E3A5F] hover:bg-[#E8F6F4]"><Languages className="mr-2 size-4 text-[#0D9488]" />{translate.isPending ? "Translating" : "Translate"}</Button><Button variant="outline" onClick={listenToDisplayedText} className="rounded-lg border-[#b8cbcf] bg-white font-bold text-[#1E3A5F] hover:bg-[#E8F6F4]"><Volume2 className="mr-2 size-4 text-[#0D9488]" />{isListening ? "Stop" : "Listen"}</Button>{displayMode !== "original" && <Button variant="ghost" onClick={() => { setDisplayMode("original"); setTranslatedText(null); }} className="rounded-lg font-bold text-[#52677d]"><RotateCcw className="mr-2 size-4" />Original</Button>}</div>
              <div aria-live="polite" className="mt-5 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#e0e9eb] bg-[#f9fbfc] p-5 text-sm leading-7 text-[#52677d]">{isTextBusy ? <span className="flex items-center gap-2 font-bold text-[#617387]"><LoaderCircle className="size-4 animate-spin text-[#0D9488]" /> Updating document text</span> : displayedText}</div></article>
            <article className="rounded-2xl border border-[#cbe8e4] bg-[#edf8f6] p-5 shadow-[0_10px_28px_rgba(13,148,136,0.06)] sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-white text-[#0D9488] shadow-sm"><Headphones className="size-5" aria-hidden="true" /></span><p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-[#0D9488]">Ask Document</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-[#1E3A5F]">Ask about this PDF</h2><p className="mt-3 text-sm leading-6 text-[#52677d]">Answers use only the extracted text in this document.</p><label className="mt-5 block text-sm font-bold text-[#1E3A5F]" htmlFor="document-question">Your question</label><textarea id="document-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={500} placeholder="For example: What is the deadline?" className="mt-2 min-h-26 w-full resize-y rounded-xl border border-[#b8d8d4] bg-white p-3 text-sm leading-6 text-[#17324E] placeholder:text-[#8091a0]" /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-[#617387]">{question.length}/500</span><Button onClick={askQuestion} disabled={ask.isPending || !question.trim()} className="rounded-lg bg-[#0D9488] font-bold text-white hover:bg-[#0b756c] disabled:bg-[#9fc8c3]">{ask.isPending ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Answering</> : <><Send className="mr-2 size-4" /> Ask Document</>}</Button></div>{answer && <div aria-live="polite" className="mt-5 rounded-xl border border-[#b8d8d4] bg-white p-4 text-sm leading-6 text-[#39576d]"><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#0D9488]">Answer</p>{answer}</div>}</article>
          </div>
        ) : (
          <div className="mt-7 flex min-h-52 items-center justify-center rounded-2xl border border-[#dbe5e8] bg-white text-sm font-bold text-[#617387]"><LoaderCircle className="mr-2 size-4 animate-spin text-[#0D9488]" /> Loading document</div>
        )}
      </main>
    </AccessMateShell>
  );
}
