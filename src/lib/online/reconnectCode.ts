/**
 * Rejoin / seat codes for reclaiming a disconnected player's spot.
 *
 * A rejoin code is the 6-letter room code plus a 4-letter seat token:
 *   A3K7P2-K9M4
 *
 * Friends still in the room share this with the person who dropped so they
 * can sit back down in the same seat — even from a new device or tab.
 */

import {
  ROOM_CODE_CHARS,
  isValidRoomCode,
  normalizeRoomCode,
} from "./roomCode";

export const SEAT_CODE_LENGTH = 4;
export const REJOIN_CODE_LENGTH = 10; // 6 room + 4 seat

export function generateSeatCode(existing: Iterable<string> = []): string {
  const taken = new Set(
    Array.from(existing, (code) => code.toUpperCase())
  );
  let code = "";
  do {
    code = Array.from(
      { length: SEAT_CODE_LENGTH },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join("");
  } while (taken.has(code));
  return code;
}

export function formatRejoinCode(roomCode: string, seatCode: string): string {
  return `${normalizeRoomCode(roomCode)}-${seatCode.toUpperCase()}`;
}

/** Keep typing friendly: uppercase, strip junk, hyphen after the room code. */
export function formatJoinCodeInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, REJOIN_CODE_LENGTH);
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 6)}-${clean.slice(6)}`;
}

export type ParsedJoinInput =
  | { kind: "room"; roomCode: string }
  | { kind: "rejoin"; roomCode: string; seatCode: string }
  | { kind: "invalid" };

export function parseJoinInput(raw: string): ParsedJoinInput {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length === 6 && isValidRoomCode(clean)) {
    return { kind: "room", roomCode: clean };
  }
  if (clean.length === REJOIN_CODE_LENGTH) {
    const roomCode = clean.slice(0, 6);
    const seatCode = clean.slice(6);
    if (isValidRoomCode(roomCode) && isValidSeatCode(seatCode)) {
      return { kind: "rejoin", roomCode, seatCode };
    }
  }
  return { kind: "invalid" };
}

export function isValidSeatCode(code: string): boolean {
  return new RegExp(`^[${ROOM_CODE_CHARS}]{${SEAT_CODE_LENGTH}}$`).test(
    code.toUpperCase()
  );
}

export function isMemberConnected(member: { connected?: boolean }): boolean {
  return member.connected !== false;
}

export function connectedMembers<T extends { connected?: boolean }>(
  members: T[] | undefined
): T[] {
  return (members ?? []).filter(isMemberConnected);
}

/** Turn a typed join/rejoin field into room + optional seat token. */
export function joinPayloadFromInput(
  raw: string
): { roomCode: string; reconnectToken?: string } | null {
  const parsed = parseJoinInput(raw);
  if (parsed.kind === "invalid") return null;
  if (parsed.kind === "room") return { roomCode: parsed.roomCode };
  return { roomCode: parsed.roomCode, reconnectToken: parsed.seatCode };
}
