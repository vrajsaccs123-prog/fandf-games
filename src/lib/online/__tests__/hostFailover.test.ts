import { describe, it, expect } from "vitest";
import type { RoomInfo, RoomMember } from "../types";
import {
  electHostSuccessor,
  promoteMemberToHost,
  successorClaimIndex,
} from "../hostFailover";

function member(
  partial: Partial<RoomMember> & Pick<RoomMember, "id" | "name" | "role">
): RoomMember {
  return {
    peerId: `peer-${partial.id}`,
    connected: true,
    reconnectCode: "AAAA",
    ...partial,
  };
}

function room(members: RoomMember[], hostId = members[0].id): RoomInfo {
  return {
    roomCode: "A3K7P2",
    gameId: "blackjack",
    hostId,
    members,
    started: true,
  };
}

describe("electHostSuccessor", () => {
  it("picks the first still-connected non-host member", () => {
    const r = room([
      member({ id: "host", name: "Host", role: "host" }),
      member({ id: "p2", name: "Ada", role: "player" }),
      member({ id: "p3", name: "Bo", role: "player" }),
    ]);
    expect(electHostSuccessor(r, "host")?.id).toBe("p2");
  });

  it("skips players who already disconnected", () => {
    const r = room([
      member({ id: "host", name: "Host", role: "host" }),
      member({ id: "p2", name: "Ada", role: "player", connected: false }),
      member({ id: "p3", name: "Bo", role: "player" }),
    ]);
    expect(electHostSuccessor(r, "host")?.id).toBe("p3");
  });

  it("returns null when nobody is left", () => {
    const r = room([member({ id: "host", name: "Host", role: "host" })]);
    expect(electHostSuccessor(r, "host")).toBeNull();
  });
});

describe("successorClaimIndex", () => {
  it("is 0 for the elected successor so they claim first", () => {
    const r = room([
      member({ id: "host", name: "Host", role: "host" }),
      member({ id: "p2", name: "Ada", role: "player" }),
      member({ id: "p3", name: "Bo", role: "player" }),
    ]);
    expect(successorClaimIndex(r, "host", "p2")).toBe(0);
    expect(successorClaimIndex(r, "host", "p3")).toBe(1);
    expect(successorClaimIndex(r, "host", "host")).toBe(-1);
  });
});

describe("promoteMemberToHost", () => {
  it("demotes the old host and marks them disconnected", () => {
    const r = promoteMemberToHost(
      room([
        member({ id: "host", name: "Host", role: "host", reconnectCode: "HHHH" }),
        member({ id: "p2", name: "Ada", role: "player" }),
      ]),
      "p2"
    );
    expect(r.hostId).toBe("p2");
    expect(r.members[0]).toMatchObject({
      id: "host",
      role: "player",
      connected: false,
      reconnectCode: "HHHH",
    });
    expect(r.members[1]).toMatchObject({ id: "p2", role: "host", connected: true });
  });
});
