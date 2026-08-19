import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { deleteDocument, getDocument, getPreferredLanguage, listDocuments, setPreferredLanguage } from "./accessmateDb";
import { answerFromDocument, DocumentAssistantError, simplifyDocumentText, translateDocumentText } from "./documentAssistant";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { PdfUploadError, processDocumentUpload } from "./documentService";

function safeProcedureError(error: unknown) {
  if (error instanceof PdfUploadError || error instanceof DocumentAssistantError) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof TRPCError) return error;
  console.error("[AccessMate] Request failed", error);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The request could not be completed. Please try again." });
}

const documentIdInput = z.object({ id: z.number().int().positive() });
const documentTextInput = z.object({ documentId: z.number().int().positive() });
const languageInput = z.enum(["English", "Telugu", "Hindi"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  documents: router({
    upload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().max(100), fileData: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      try {
        return await processDocumentUpload({ user: ctx.user, ...input });
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await listDocuments(ctx.user);
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
    getById: protectedProcedure.input(documentIdInput).query(async ({ ctx, input }) => {
      try {
        const document = await getDocument(ctx.user, input.id);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
        return document;
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
    delete: protectedProcedure.input(documentIdInput).mutation(async ({ ctx, input }) => {
      try {
        const deleted = await deleteDocument(ctx.user, input.id);
        if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
        return { success: true } as const;
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
    simplify: protectedProcedure.input(documentTextInput).mutation(async ({ ctx, input }) => {
      try {
        const document = await getDocument(ctx.user, input.documentId);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
        return { text: await simplifyDocumentText(document.extractedText) };
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
    translate: protectedProcedure.input(documentTextInput.extend({ text: z.string().min(1).max(50_000), language: languageInput })).mutation(async ({ ctx, input }) => {
      try {
        const document = await getDocument(ctx.user, input.documentId);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
        return { text: await translateDocumentText(input.text, input.language), language: input.language };
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
    ask: protectedProcedure.input(documentTextInput.extend({ question: z.string().min(1).max(500), language: languageInput })).mutation(async ({ ctx, input }) => {
      try {
        const document = await getDocument(ctx.user, input.documentId);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
        return { answer: await answerFromDocument(document.extractedText, input.question, input.language) };
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
  }),
  preferences: router({
    getLanguage: protectedProcedure.query(async ({ ctx }) => {
      try {
        return { language: await getPreferredLanguage(ctx.user) };
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
    setLanguage: protectedProcedure.input(z.object({ language: languageInput })).mutation(async ({ ctx, input }) => {
      try {
        return { language: await setPreferredLanguage(ctx.user, input.language) };
      } catch (error) {
        throw safeProcedureError(error);
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
