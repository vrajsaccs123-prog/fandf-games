/**
 * Room code utilities for online multiplayer.
 *
 * Codes are 6 characters, uppercase, no ambiguous chars (0/O, 1/I, etc.).
 * Example: "A3K7P2"
 */

// No 0, O, I, 1 to avoid confusion when sharing
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  return Array.from(
    { length: 6 },
    () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  ).join("");
}

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(normalizeRoomCode(code));
}
