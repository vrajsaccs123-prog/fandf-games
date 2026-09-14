import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { getGameById } from "@/catalogue/gameRegistry";
import { siteConfig } from "@/lib/site";

export const alt = "F&F Games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface GameOgImageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GameOpenGraphImage({ params }: GameOgImageProps) {
  const { gameId } = await params;
  const game = getGameById(gameId);
  if (!game) notFound();

  const logoPath = join(process.cwd(), "public/icons/icon-512.png");
  const logoData = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  const title = `${game.name} — ${siteConfig.name}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(135deg, #0c0a08 0%, #121810 45%, #0f3720 100%)",
          padding: "64px 80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 35% 50%, rgba(50,130,85,0.18) 0%, transparent 55%)",
          }}
        />
        <img
          src={logoSrc}
          alt=""
          width={300}
          height={300}
          style={{ marginRight: 56, flexShrink: 0 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 680,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#ebe4d7",
              lineHeight: 1.1,
              marginBottom: 20,
              fontFamily: "Georgia, serif",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#968773",
              lineHeight: 1.35,
              fontFamily: "Arial, sans-serif",
            }}
          >
            {game.shortDescription}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
