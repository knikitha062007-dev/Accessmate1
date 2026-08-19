import { afterEach, describe, expect, it, vi } from "vitest";
import { speakDocumentText, stopDocumentSpeech } from "../client/src/lib/tts";

class FakeSpeechSynthesisUtterance {
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly text: string) {}
}

afterEach(() => vi.unstubAllGlobals());

describe("browser document listening", () => {
  it("speaks the currently displayed text in the selected locale", () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { cancel, speak } });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeSpeechSynthesisUtterance);

    const result = speakDocumentText("AccessMate is ready.", "te-IN");

    expect(result).toEqual({ started: true });
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledOnce();
    const utterance = speak.mock.calls[0]?.[0] as FakeSpeechSynthesisUtterance;
    expect(utterance.text).toBe("AccessMate is ready.");
    expect(utterance.lang).toBe("te-IN");
  });

  it("cancels an existing utterance before starting a new one and resets through its completion callback", () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    const onEnd = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { cancel, speak } });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeSpeechSynthesisUtterance);

    speakDocumentText("First document text.", "en-US");
    speakDocumentText("Current document text.", "hi-IN", { onEnd });

    expect(cancel).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenCalledTimes(2);
    const currentUtterance = speak.mock.calls[1]?.[0] as FakeSpeechSynthesisUtterance;
    currentUtterance.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("stops speech immediately through the browser cancellation API", () => {
    const cancel = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { cancel, speak: vi.fn() } });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeSpeechSynthesisUtterance);

    expect(stopDocumentSpeech()).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("returns an accessible explanation when speech support is unavailable", () => {
    vi.stubGlobal("window", {});
    expect(speakDocumentText("Text", "en-US")).toEqual({ started: false, reason: "Text-to-speech is not supported by this browser." });
    expect(stopDocumentSpeech()).toBe(false);
  });
});
