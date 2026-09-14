/**
 * Unique modern-art compositions for every painting card.
 *
 * Artwork colors are chosen outside each artist's official palette/accent
 * so the painting never repeats the identity color used on the card frame.
 */

import * as React from "react";
import type { ArtistId, PaintingCard } from "../types";

type Palette = {
  paper: string;
  a: string;
  b: string;
  c: string;
  ink: string;
};

/** [paper, a, b, c, ink] — none of these match the artist's defined colors. */
type Swatch = readonly [string, string, string, string, string];

const SWATCHES: Record<ArtistId, readonly Swatch[]> = {
  "manuel-carvalho": [
    ["#f3e6d0", "#c24620", "#8a3a1c", "#d4a04a", "#241510"],
    ["#f7efe2", "#a83240", "#e07a48", "#5c2a22", "#1c1210"],
    ["#efe4cc", "#6b4a1e", "#c9892a", "#d4653a", "#2a1c10"],
    ["#f5ddd0", "#7a2d3b", "#d4a04a", "#c45c26", "#1f1412"],
    ["#f0e8d8", "#9a4a28", "#e8b86a", "#4a2818", "#2c1810"],
    ["#f8e6d8", "#b03a2e", "#8b5a2a", "#f0c48a", "#221410"],
    ["#eee0c8", "#c46a20", "#6a3020", "#e0a040", "#1a100c"],
    ["#f4ecd8", "#8b3e2a", "#d8b056", "#5a2018", "#261810"],
    ["#f2dcc8", "#a04020", "#e8c070", "#7a4830", "#1e120c"],
    ["#f6e8dc", "#6e2a28", "#d09040", "#c07050", "#201410"],
    ["#efe6d4", "#b85820", "#4a2018", "#e0b860", "#1c100c"],
    ["#f7e0d0", "#8a2828", "#d4a060", "#c07038", "#241410"],
  ],
  "ramon-martins": [
    ["#e4eef0", "#0e6e6e", "#3d2a6e", "#c43a7a", "#12161c"],
    ["#e8f2f4", "#1a5a72", "#6a3a8a", "#2a8a8a", "#101418"],
    ["#dde8ec", "#0a4a5a", "#c05090", "#4a7088", "#14181c"],
    ["#eef4f6", "#2a3a6a", "#1a8a7a", "#8a4aaa", "#10141a"],
    ["#e2ece8", "#0d5c5c", "#5a2870", "#3a9aaa", "#12161a"],
    ["#e8eef2", "#1a4a68", "#b04080", "#2a7a6a", "#101418"],
    ["#dce8ea", "#0a3850", "#7a38a0", "#2a9a8a", "#12161c"],
    ["#eef6f4", "#146060", "#4a2a78", "#c04888", "#101418"],
    ["#e0eae8", "#0e4a58", "#8a3080", "#3a8898", "#14181c"],
    ["#e6f0f2", "#1a3a58", "#2a8a7a", "#6a3890", "#10141a"],
    ["#d8e6e8", "#0a5a62", "#c03878", "#3a5a78", "#12161a"],
    ["#eaf2f0", "#165858", "#5a2080", "#2a9aaa", "#101418"],
    ["#e2ecf0", "#0e3858", "#a04090", "#1a7a6e", "#14181c"],
    ["#e8f4f2", "#1a6868", "#3a2a68", "#c05080", "#101418"],
    ["#dce8ec", "#0a4a62", "#7a2890", "#2a8a9a", "#12161a"],
  ],
  "daniel-melim": [
    ["#f3ecd4", "#6a6a20", "#c4a028", "#8a4a20", "#1c1810"],
    ["#efe6cc", "#4a5a20", "#d4b040", "#7a3a18", "#18140c"],
    ["#f6f0d8", "#7a5a18", "#3a4a20", "#c89030", "#1a160e"],
    ["#ebe2c8", "#5a4a18", "#b87828", "#8a6a28", "#16120a"],
    ["#f4ead0", "#3a4a1c", "#d0a030", "#6a3018", "#1c160e"],
    ["#f0e6c8", "#8a6a20", "#4a3820", "#c4a040", "#18140c"],
    ["#f7f0dc", "#5a6a28", "#c08028", "#3a3018", "#1a160e"],
    ["#ece4cc", "#7a4a18", "#9a8a30", "#5a2810", "#16120a"],
    ["#f2e8d0", "#4a5a28", "#d4b848", "#8a5020", "#1c1810"],
    ["#efe4c4", "#6a4a16", "#3a4a1c", "#c89828", "#18140c"],
    ["#f5eed8", "#8a7a28", "#6a3018", "#d0a838", "#1a160e"],
    ["#e8e0c4", "#4a3a14", "#b89030", "#6a5a20", "#16120a"],
    ["#f3e8cc", "#7a6820", "#c07020", "#3a4a18", "#1c1810"],
    ["#f0ead4", "#5a4818", "#d4b040", "#8a3a14", "#18140c"],
  ],
  "rafael-silveira": [
    ["#e8ece8", "#3a4a52", "#b8943a", "#5a6a4a", "#141816"],
    ["#eef0ec", "#2a3a42", "#c4a048", "#6a7a58", "#101412"],
    ["#e4e8e4", "#4a5a50", "#a08030", "#2a3840", "#161a18"],
    ["#f0f2ee", "#3a4a3a", "#c8a850", "#4a5a62", "#121614"],
    ["#e6eae6", "#2a3840", "#b89038", "#6a7a4a", "#141816"],
    ["#eceeea", "#4a5a62", "#d0b048", "#3a4a3a", "#101412"],
    ["#e2e6e2", "#3a4a42", "#a88830", "#5a6a72", "#161a18"],
    ["#f2f4f0", "#2a3a32", "#c4a040", "#4a5a50", "#121614"],
    ["#e8ece6", "#4a5a58", "#b89438", "#6a7a62", "#141816"],
    ["#eef0ea", "#3a4a52", "#d0b850", "#2a3a32", "#101412"],
    ["#e4e8e2", "#5a6a58", "#a08028", "#3a4a52", "#161a18"],
    ["#f0f2ec", "#2a3840", "#c8a848", "#5a6a4a", "#121614"],
    ["#e6eae4", "#4a5a42", "#b89030", "#3a4a58", "#141816"],
    ["#eceee8", "#3a4a3a", "#d0b040", "#5a6a72", "#101412"],
    ["#e2e6e0", "#2a3a42", "#a88828", "#6a7a50", "#161a18"],
    ["#f2f4ee", "#4a5a52", "#c4a038", "#2a3840", "#121614"],
  ],
  "sigrid-thaler": [
    ["#f4e6e4", "#7a2038", "#c9a040", "#5a2040", "#1c1014"],
    ["#f8ece8", "#8a2848", "#d4b050", "#4a1830", "#181014"],
    ["#f0e2de", "#6a1830", "#c09038", "#8a3050", "#1a1014"],
    ["#f6e8e4", "#5a1428", "#d8b848", "#7a2840", "#161014"],
    ["#f2e4e0", "#8a2040", "#c4a040", "#4a1028", "#1c1014"],
    ["#f8eee8", "#6a2038", "#d0a848", "#8a3858", "#181014"],
    ["#efe0dc", "#7a1834", "#b88830", "#5a1838", "#1a1014"],
    ["#f5e8e2", "#4a1028", "#d4b040", "#8a2848", "#161014"],
    ["#f3e6e0", "#8a3048", "#c9a038", "#5a1430", "#1c1014"],
    ["#f7ece6", "#6a1838", "#d8b850", "#7a2040", "#181014"],
    ["#f0e2dc", "#5a1430", "#c09030", "#8a3850", "#1a1014"],
    ["#f6eae4", "#7a2040", "#d0a840", "#4a1028", "#161014"],
    ["#f2e4de", "#8a2840", "#b88828", "#5a1838", "#1c1014"],
  ],
};

const ARTIST_SEED: Record<ArtistId, number> = {
  "manuel-carvalho": 0,
  "ramon-martins": 7,
  "daniel-melim": 13,
  "rafael-silveira": 3,
  "sigrid-thaler": 19,
};

function paletteFor(card: PaintingCard): Palette {
  const list = SWATCHES[card.artistId];
  const [paper, a, b, c, ink] = list[card.artistIndex % list.length];
  return { paper, a, b, c, ink };
}

function compositionIndex(card: PaintingCard): number {
  return (ARTIST_SEED[card.artistId] + card.artistIndex * 3) % 16;
}

function Composition({
  variant,
  p,
  idx,
}: {
  variant: number;
  p: Palette;
  idx: number;
}) {
  switch (variant) {
    case 0:
      return <Constellation p={p} idx={idx} />;
    case 1:
      return <Construct p={p} idx={idx} />;
    case 2:
      return <ColorField p={p} idx={idx} />;
    case 3:
      return <Orbit p={p} idx={idx} />;
    case 4:
      return <Slash p={p} idx={idx} />;
    case 5:
      return <Pavilion p={p} idx={idx} />;
    case 6:
      return <Scatter p={p} idx={idx} />;
    case 7:
      return <Tide p={p} idx={idx} />;
    case 8:
      return <Tessera p={p} idx={idx} />;
    case 9:
      return <Fan p={p} idx={idx} />;
    case 10:
      return <Dialogue p={p} idx={idx} />;
    case 11:
      return <Ascent p={p} idx={idx} />;
    case 12:
      return <Echo p={p} idx={idx} />;
    case 13:
      return <Fold p={p} idx={idx} />;
    case 14:
      return <Bloom p={p} idx={idx} />;
    default:
      return <Axis p={p} idx={idx} />;
  }
}

function Constellation({ p, idx }: { p: Palette; idx: number }) {
  const ox = 6 + (idx % 4) * 4;
  return (
    <>
      <rect x="0" y="62" width="100" height="38" fill={p.b} />
      <circle cx={30 + ox} cy={34} r={30} fill={p.a} />
      <circle cx={74 - ox} cy={70} r={24} fill={p.c} />
      <circle cx={62} cy={24} r={11} fill={p.ink} />
      <circle cx={16} cy={78} r={8} fill={p.paper} />
      <circle cx={48} cy={52} r={5} fill={p.paper} />
    </>
  );
}

function Construct({ p, idx }: { p: Palette; idx: number }) {
  const tilt = (idx % 3) * 5;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.b} />
      <polygon points={`${8 + tilt},96 50,6 92,96`} fill={p.a} />
      <polygon points="22,88 50,24 78,88" fill={p.c} />
      <polygon points={`${6},${36 + tilt} 40,14 36,70`} fill={p.ink} />
      <rect x="44" y="8" width="4" height="84" fill={p.paper} />
    </>
  );
}

function ColorField({ p, idx }: { p: Palette; idx: number }) {
  const barX = idx % 2 === 0 ? 10 : 72;
  return (
    <>
      <rect x="0" y="0" width="100" height="36" fill={p.a} />
      <rect x="0" y="36" width="100" height="32" fill={p.b} />
      <rect x="0" y="68" width="100" height="32" fill={p.c} />
      <rect x={barX} y="8" width="18" height="84" fill={p.ink} />
      <rect x={barX + 4} y="14" width="10" height="26" fill={p.paper} />
      <circle cx={barX === 10 ? 80 : 22} cy="22" r="7" fill={p.paper} />
    </>
  );
}

function Orbit({ p, idx }: { p: Palette; idx: number }) {
  const cx = idx % 2 === 0 ? 38 : 62;
  const cy = idx % 3 === 0 ? 40 : 58;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.b} />
      <circle cx={cx} cy={cy} r={48} fill={p.a} />
      <circle cx={cx} cy={cy} r={34} fill={p.paper} />
      <circle cx={cx} cy={cy} r={24} fill={p.c} />
      <circle cx={cx} cy={cy} r={12} fill={p.ink} />
      <circle cx={100 - cx} cy={100 - cy} r={10} fill={p.paper} />
    </>
  );
}

function Slash({ p, idx }: { p: Palette; idx: number }) {
  const skew = 6 + (idx % 4) * 5;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      <polygon points={`${-24 + skew},0 18,0 -2,100 ${-44 + skew},100`} fill={p.a} />
      <polygon points={`${12 + skew},0 46,0 26,100 ${-8 + skew},100`} fill={p.b} />
      <polygon points={`${42 + skew},0 76,0 56,100 ${22 + skew},100`} fill={p.c} />
      <polygon points={`${72 + skew},0 128,0 108,100 ${52 + skew},100`} fill={p.ink} />
    </>
  );
}

function Pavilion({ p, idx }: { p: Palette; idx: number }) {
  const gap = 3 + (idx % 3);
  return (
    <>
      <rect x="0" y="70" width="100" height="30" fill={p.ink} />
      <rect x="8" y="10" width="84" height="24" rx="2" fill={p.a} />
      <rect x={12 + gap} y="38" width={54} height="20" rx="2" fill={p.b} />
      <rect x="20" y="62" width="38" height="22" rx="2" fill={p.c} />
      <rect x="64" y="44" width="24" height="44" rx="2" fill={p.paper} />
    </>
  );
}

function Scatter({ p, idx }: { p: Palette; idx: number }) {
  const shift = (idx % 5) - 2;
  const dots = [
    [20, 22, 16, p.a],
    [56, 16, 11, p.b],
    [80, 36, 18, p.c],
    [34, 50, 13, p.ink],
    [68, 66, 15, p.a],
    [16, 72, 10, p.b],
    [48, 84, 9, p.c],
    [88, 78, 8, p.ink],
    [44, 30, 6, p.paper],
  ] as const;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      <rect x="0" y="58" width="100" height="42" fill={p.b} opacity="0.35" />
      {dots.map(([x, y, r, fill], i) => (
        <circle key={i} cx={x + shift} cy={y} r={r} fill={fill} />
      ))}
    </>
  );
}

function Tide({ p, idx }: { p: Palette; idx: number }) {
  const lift = (idx % 4) * 3;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      <circle cx={22 + lift} cy={20} r={8} fill={p.ink} />
      <circle cx={78} cy={16} r={5} fill={p.a} />
      <path
        d={`M-8 ${44 + lift} C 22 ${14 + lift}, 42 ${76 + lift}, 108 ${36 + lift} V110 H-8 Z`}
        fill={p.a}
      />
      <path
        d={`M-8 ${58 + lift} C 30 ${32 + lift}, 58 ${90 + lift}, 108 ${54 + lift} V110 H-8 Z`}
        fill={p.b}
      />
      <path
        d={`M-8 ${76 + lift} C 34 ${56 + lift}, 72 ${98 + lift}, 108 ${72 + lift} V110 H-8 Z`}
        fill={p.c}
      />
    </>
  );
}

function Tessera({ p, idx }: { p: Palette; idx: number }) {
  const colors = [p.a, p.b, p.c, p.ink, p.a, p.b, p.c];
  const cells = [
    [6, 6, 42, 30],
    [52, 6, 42, 18],
    [52, 28, 42, 26],
    [6, 40, 24, 28],
    [34, 40, 14, 28],
    [6, 72, 42, 22],
    [52, 58, 20, 36],
    [76, 58, 18, 36],
  ] as const;
  return (
    <>
      {cells.map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          fill={colors[(i + idx) % colors.length]}
        />
      ))}
    </>
  );
}

function Fan({ p, idx }: { p: Palette; idx: number }) {
  const fromRight = idx % 2 === 1;
  const ox = fromRight ? 96 : 4;
  const oy = 98;
  const colors = [p.a, p.b, p.c, p.ink, p.a, p.b];
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      {colors.map((fill, i) => {
        // SVG y grows downward; -90° is up. Sweep toward the open side of the card.
        const start = fromRight ? -90 - i * 18 : -90 + i * 18;
        const end = fromRight ? start - 16 : start + 16;
        const r = 140;
        const rad = (deg: number) => (deg * Math.PI) / 180;
        const x0 = ox + r * Math.cos(rad(start));
        const y0 = oy + r * Math.sin(rad(start));
        const x1 = ox + r * Math.cos(rad(end));
        const y1 = oy + r * Math.sin(rad(end));
        return (
          <path
            key={i}
            d={`M ${ox} ${oy} L ${x0} ${y0} L ${x1} ${y1} Z`}
            fill={fill}
          />
        );
      })}
    </>
  );
}

function Dialogue({ p, idx }: { p: Palette; idx: number }) {
  const flip = idx % 2 === 0;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      <rect x={flip ? 6 : 40} y="14" width="54" height="72" fill={p.a} />
      <circle cx={flip ? 74 : 26} cy="56" r="28" fill={p.b} />
      <rect x={flip ? 12 : 46} y="22" width="20" height="20" fill={p.c} />
      <circle cx={flip ? 20 : 80} cy="80" r="7" fill={p.ink} />
      <rect x={flip ? 70 : 8} y="10" width="8" height="8" fill={p.ink} />
    </>
  );
}

function Ascent({ p, idx }: { p: Palette; idx: number }) {
  const dir = idx % 2 === 0 ? 1 : -1;
  const steps = [
    [6, 70, 24, 24, p.a],
    [28, 50, 24, 44, p.b],
    [50, 28, 24, 66, p.c],
    [72, 10, 22, 84, p.ink],
  ] as const;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      {steps.map(([x, y, w, h, fill], i) => (
        <rect
          key={i}
          x={dir === 1 ? x : 100 - x - w}
          y={y}
          width={w}
          height={h}
          fill={fill}
        />
      ))}
    </>
  );
}

function Echo({ p, idx }: { p: Palette; idx: number }) {
  const cx = 50 + ((idx % 3) - 1) * 8;
  const cy = 50;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.ink} />
      <rect x={cx - 42} y={cy - 42} width="84" height="84" rx="8" fill={p.a} />
      <rect x={cx - 30} y={cy - 30} width="60" height="60" rx="6" fill={p.paper} />
      <rect x={cx - 20} y={cy - 20} width="40" height="40" rx="5" fill={p.b} />
      <rect x={cx - 10} y={cy - 10} width="20" height="20" rx="3" fill={p.c} />
    </>
  );
}

function Fold({ p, idx }: { p: Palette; idx: number }) {
  const y = 4 + (idx % 3) * 3;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      <polygon
        points={`0,${y} 50,${y + 24} 100,${y} 100,${y + 30} 50,${y + 54} 0,${y + 30}`}
        fill={p.a}
      />
      <polygon
        points={`0,${y + 28} 50,${y + 52} 100,${y + 28} 100,${y + 58} 50,${y + 82} 0,${y + 58}`}
        fill={p.b}
      />
      <polygon
        points={`0,${y + 56} 50,${y + 80} 100,${y + 56} 100,110 0,110`}
        fill={p.c}
      />
      <polyline
        points={`0,${y + 16} 50,${y + 40} 100,${y + 16}`}
        fill="none"
        stroke={p.ink}
        strokeWidth="3"
      />
    </>
  );
}

function Bloom({ p, idx }: { p: Palette; idx: number }) {
  const ox = (idx % 4) * 4;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      <ellipse cx={38 + ox} cy="50" rx="34" ry="28" fill={p.a} />
      <ellipse cx={64 - ox} cy="40" rx="26" ry="32" fill={p.b} />
      <ellipse cx="50" cy="66" rx="30" ry="22" fill={p.c} />
      <ellipse cx={26 + ox} cy="34" rx="13" ry="17" fill={p.ink} />
      <circle cx={78} cy={78} r="8" fill={p.ink} />
    </>
  );
}

function Axis({ p, idx }: { p: Palette; idx: number }) {
  const thick = 18 + (idx % 3) * 3;
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill={p.paper} />
      <rect x={50 - thick / 2} y="6" width={thick} height="88" fill={p.a} />
      <rect x="8" y={50 - thick / 2} width="84" height={thick} fill={p.b} />
      <rect x="10" y="10" width="20" height="20" fill={p.c} />
      <rect x="70" y="70" width="20" height="20" fill={p.ink} />
      <rect x="72" y="10" width="14" height="14" fill={p.c} />
      <rect x="10" y="72" width="14" height="14" fill={p.ink} />
    </>
  );
}

export function ArtworkGraphic({ card }: { card: PaintingCard }) {
  const palette = paletteFor(card);
  const variant = compositionIndex(card);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full"
      aria-hidden="true"
    >
      <rect width="100" height="100" fill={palette.paper} />
      <Composition variant={variant} p={palette} idx={card.artistIndex} />
    </svg>
  );
}
