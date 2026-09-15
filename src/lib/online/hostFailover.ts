/**
 * Host failover helpers — pick the next host when the current one drops.
 *
 * Remaining members keep their join order. The first still-connected
 * non-host player becomes the successor so every device elects the same person.
 */

import type { RoomInfo, RoomMember } from "./types";
import { isMemberConnected } from "./reconnectCode";

export function hostSuccessorCandidates(
  room: RoomInfo,
  departedHostId: string
): RoomMember[] {
  return room.members.filter(
    (m) => m.id !== departedHostId && isMemberConnected(m)
  );
}

export function electHostSuccessor(
  room: RoomInfo,
  departedHostId: string
): RoomMember | null {
  return hostSuccessorCandidates(room, departedHostId)[0] ?? null;
}

export function successorClaimIndex(
  room: RoomInfo,
  departedHostId: string,
  playerId: string
): number {
  return hostSuccessorCandidates(room, departedHostId).findIndex(
    (m) => m.id === playerId
  );
}

/** Move hosting to `newHostId` and sit the old host back down as a player. */
export function promoteMemberToHost(
  room: RoomInfo,
  newHostId: string,
  departedReconnectCode?: string
): RoomInfo {
  const oldHostId = room.hostId;
  return {
    ...room,
    hostId: newHostId,
    members: room.members.map((m) => {
      if (m.id === newHostId) {
        return { ...m, role: "host" as const, connected: true };
      }
      if (m.id === oldHostId) {
        return {
          ...m,
          role: "player" as const,
          connected: false,
          reconnectCode: m.reconnectCode ?? departedReconnectCode,
        };
      }
      return m;
    }),
  };
}
