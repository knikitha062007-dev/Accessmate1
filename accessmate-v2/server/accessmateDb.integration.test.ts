import { describe, expect, it } from "vitest";
import { verifyAccessMateDatabase } from "./accessmateDb";

describe("AccessMate Neon integration", () => {
  it("connects securely and ensures the required AccessMate tables exist", async () => {
    await expect(verifyAccessMateDatabase()).resolves.toBe(true);
  }, 15000);
});
