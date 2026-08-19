export type SpeechHandlers = {
  onEnd?: () => void;
  onError?: () => void;
};

function hasSpeechSupport() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function stopDocumentSpeech() {
  if (!hasSpeechSupport()) return false;
  window.speechSynthesis.cancel();
  return true;
}

export function speakDocumentText(text: string, locale: string, handlers: SpeechHandlers = {}) {
  if (!text.trim()) return { started: false, reason: "No text is available to read aloud." } as const;
  if (!hasSpeechSupport()) {
    return { started: false, reason: "Text-to-speech is not supported by this browser." } as const;
  }

  stopDocumentSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.92;
  utterance.onend = handlers.onEnd ?? null;
  utterance.onerror = handlers.onError ?? null;
  window.speechSynthesis.speak(utterance);
  return { started: true } as const;
}
