import { beforeEach, describe, expect, it, vi } from "vitest";

const llmMocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => llmMocks);

import { answerFromDocument, simplifyDocumentText, translateDocumentText } from "./documentAssistant";

function mockResponse(text: string) {
  llmMocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: text } }] });
}

describe("AccessMate document assistant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends extracted text to the simplify operation with plain-language boundaries", async () => {
    mockResponse("A simple explanation.");
    await expect(simplifyDocumentText("The agreement begins on Monday.")).resolves.toBe("A simple explanation.");
    expect(llmMocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini" }));
    expect(llmMocks.invokeLLM.mock.calls[0]?.[0].messages[0]?.content).toContain("untrusted data");
  });

  it("returns the original text for English and calls the model for Telugu translation", async () => {
    await expect(translateDocumentText("Hello", "English")).resolves.toBe("Hello");
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
    mockResponse("నమస్కారం");
    await expect(translateDocumentText("Hello", "Telugu")).resolves.toBe("నమస్కారం");
  });

  it("requires answers to remain grounded in the extracted document text", async () => {
    mockResponse("The meeting is on Monday.");
    await expect(answerFromDocument("The meeting is on Monday.", "When is the meeting?", "Hindi")).resolves.toBe("The meeting is on Monday.");
    const systemPrompt = llmMocks.invokeLLM.mock.calls[0]?.[0].messages[0]?.content;
    expect(systemPrompt).toContain("only the supplied document text");
    expect(systemPrompt).toContain("Hindi");
  });
});
