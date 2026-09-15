/**
 * Unit tests for rejoin / seat-code parsing.
 */

import { describe, it, expect } from "vitest";
import {
  formatJoinCodeInput,
  formatRejoinCode,
  generateSeatCode,
  parseJoinInput,
  isValidSeatCode,
  joinPayloadFromInput,
  SEAT_CODE_LENGTH,
} from "../reconnectCode";

describe("generateSeatCode", () => {
  it("returns a 4-character code from the room-code alphabet", () => {
    const code = generateSeatCode();
    expect(code).toHaveLength(SEAT_CODE_LENGTH);
    expect(isValidSeatCode(code)).toBe(true);
  });

  it("avoids codes already in use", () => {
    const first = generateSeatCode();
    const second = generateSeatCode([first]);
    expect(second).not.toBe(first);
  });
});

describe("parseJoinInput", () => {
  it("parses a 6-letter room code", () => {
    expect(parseJoinInput("a3k7p2")).toEqual({
      kind: "room",
      roomCode: "A3K7P2",
    });
  });

  it("parses a hyphenated rejoin code", () => {
    expect(parseJoinInput("A3K7P2-K9M4")).toEqual({
      kind: "rejoin",
      roomCode: "A3K7P2",
      seatCode: "K9M4",
    });
  });

  it("parses a 10-letter rejoin code without a hyphen", () => {
    expect(parseJoinInput("a3k7p2k9m4")).toEqual({
      kind: "rejoin",
      roomCode: "A3K7P2",
      seatCode: "K9M4",
    });
  });

  it("rejects short or junk input", () => {
    expect(parseJoinInput("ABC")).toEqual({ kind: "invalid" });
    expect(parseJoinInput("")).toEqual({ kind: "invalid" });
  });
});

describe("joinPayloadFromInput", () => {
  it("returns a room payload or a rejoin payload", () => {
    expect(joinPayloadFromInput("A3K7P2")).toEqual({ roomCode: "A3K7P2" });
    expect(joinPayloadFromInput("A3K7P2-K9M4")).toEqual({
      roomCode: "A3K7P2",
      reconnectToken: "K9M4",
    });
    expect(joinPayloadFromInput("nope")).toBeNull();
  });
});

describe("formatJoinCodeInput", () => {
  it("uppercases and inserts a hyphen after the room code", () => {
    expect(formatJoinCodeInput("a3k7p2k9m4")).toBe("A3K7P2-K9M4");
    expect(formatJoinCodeInput("a3k7")).toBe("A3K7");
  });
});

describe("formatRejoinCode", () => {
  it("joins room + seat with a hyphen", () => {
    expect(formatRejoinCode("a3k7p2", "k9m4")).toBe("A3K7P2-K9M4");
  });
});
