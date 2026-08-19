import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const accessmateDbMocks = vi.hoisted(() => ({
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
  getPreferredLanguage: vi.fn(),
  listDocuments: vi.fn(),
  setPreferredLanguage: vi.fn(),
}));

const documentServiceMocks = vi.hoisted(() => ({ processDocumentUpload: vi.fn() }));
const documentAssistantMocks = vi.hoisted(() => ({
  answerFromDocument: vi.fn(),
  simplifyDocumentText: vi.fn(),
  translateDocumentText: vi.fn(),
}));

vi.mock("./accessmateDb", () => accessmateDbMocks);
vi.mock("./documentAssistant", () => ({
  DocumentAssistantError: class DocumentAssistantError extends Error {},
  ...documentAssistantMocks,
}));
vi.mock("./documentService", async importOriginal => ({
  ...(await importOriginal<typeof import("./documentService")>()),
  processDocumentUpload: documentServiceMocks.processDocumentUpload,
}));

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "accessmate-procedure-test",
      name: "Procedure Test",
      email: "procedure@example.test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("AccessMate procedures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the requested supported language against the current user", async () => {
    accessmateDbMocks.setPreferredLanguage.mockResolvedValue("Telugu");
    const ctx = createContext();
    const result = await appRouter.createCaller(ctx).preferences.setLanguage({ language: "Telugu" });
    expect(result).toEqual({ language: "Telugu" });
    expect(accessmateDbMocks.setPreferredLanguage).toHaveBeenCalledWith(ctx.user, "Telugu");
  });

  it.each(["English", "Telugu", "Hindi"] as const)("accepts %s as a supported language", async language => {
    accessmateDbMocks.setPreferredLanguage.mockResolvedValue(language);
    const result = await appRouter.createCaller(createContext()).preferences.setLanguage({ language });
    expect(result).toEqual({ language });
  });

  it("rejects an unsupported language choice", async () => {
    await expect(appRouter.createCaller(createContext()).preferences.setLanguage({ language: "Spanish" as "English" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns the saved language for the current user", async () => {
    accessmateDbMocks.getPreferredLanguage.mockResolvedValue("Hindi");
    const ctx = createContext();
    await expect(appRouter.createCaller(ctx).preferences.getLanguage()).resolves.toEqual({ language: "Hindi" });
    expect(accessmateDbMocks.getPreferredLanguage).toHaveBeenCalledWith(ctx.user);
  });

  it("returns the current user's private document list", async () => {
    accessmateDbMocks.listDocuments.mockResolvedValue([{ id: 7, fileName: "guide.pdf" }]);
    const ctx = createContext();
    await expect(appRouter.createCaller(ctx).documents.list()).resolves.toEqual([{ id: 7, fileName: "guide.pdf" }]);
    expect(accessmateDbMocks.listDocuments).toHaveBeenCalledWith(ctx.user);
  });

  it("routes a base64 PDF upload through the processing service", async () => {
    documentServiceMocks.processDocumentUpload.mockResolvedValue({ id: 7, fileName: "guide.pdf" });
    const ctx = createContext();
    const result = await appRouter.createCaller(ctx).documents.upload({ fileName: "guide.pdf", mimeType: "application/pdf", fileData: "JVBERi0=" });
    expect(result).toEqual({ id: 7, fileName: "guide.pdf" });
    expect(documentServiceMocks.processDocumentUpload).toHaveBeenCalledWith({ user: ctx.user, fileName: "guide.pdf", mimeType: "application/pdf", fileData: "JVBERi0=" });
  });

  it("gets and deletes only the document requested by the current user", async () => {
    accessmateDbMocks.getDocument.mockResolvedValue({ id: 7, fileName: "guide.pdf" });
    accessmateDbMocks.deleteDocument.mockResolvedValue(true);
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.documents.getById({ id: 7 })).resolves.toEqual({ id: 7, fileName: "guide.pdf" });
    await expect(caller.documents.delete({ id: 7 })).resolves.toEqual({ success: true });
    expect(accessmateDbMocks.getDocument).toHaveBeenCalledWith(ctx.user, 7);
    expect(accessmateDbMocks.deleteDocument).toHaveBeenCalledWith(ctx.user, 7);
  });

  it("simplifies, translates, and answers using only the current user's document", async () => {
    accessmateDbMocks.getDocument.mockResolvedValue({ id: 7, extractedText: "The deadline is Monday." });
    documentAssistantMocks.simplifyDocumentText.mockResolvedValue("The deadline is Monday.");
    documentAssistantMocks.translateDocumentText.mockResolvedValue("గడువు సోమవారం.");
    documentAssistantMocks.answerFromDocument.mockResolvedValue("The deadline is Monday.");
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.documents.simplify({ documentId: 7 })).resolves.toEqual({ text: "The deadline is Monday." });
    await expect(caller.documents.translate({ documentId: 7, text: "The deadline is Monday.", language: "Telugu" })).resolves.toEqual({ text: "గడువు సోమవారం.", language: "Telugu" });
    await expect(caller.documents.ask({ documentId: 7, question: "When is the deadline?", language: "English" })).resolves.toEqual({ answer: "The deadline is Monday." });

    expect(documentAssistantMocks.simplifyDocumentText).toHaveBeenCalledWith("The deadline is Monday.");
    expect(documentAssistantMocks.translateDocumentText).toHaveBeenCalledWith("The deadline is Monday.", "Telugu");
    expect(documentAssistantMocks.answerFromDocument).toHaveBeenCalledWith("The deadline is Monday.", "When is the deadline?", "English");
  });
});
