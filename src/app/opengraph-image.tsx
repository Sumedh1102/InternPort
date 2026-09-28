import { ImageResponse } from "next/og";

import { BRAND_COLORS, LOGO_LOCKUP, LOGO_MARK_PATH, LOGO_WORDMARK_PATH } from "@/lib/brand";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — Learn today. Build tomorrow.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const grid =
    "linear-gradient(to right, rgba(11,11,12,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,11,12,0.08) 1px, transparent 1px)";
  const logoHeight = 72;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#faf6ec",
          backgroundImage: grid,
          backgroundSize: "40px 40px",
          color: "#0b0b0c",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg
            width={(logoHeight * LOGO_LOCKUP.width) / LOGO_LOCKUP.height}
            height={logoHeight}
            viewBox={`0 0 ${LOGO_LOCKUP.width} ${LOGO_LOCKUP.height}`}
          >
            <path d={LOGO_MARK_PATH} fill={BRAND_COLORS.teal} />
            <path d={LOGO_WORDMARK_PATH} fill={BRAND_COLORS.slate} />
          </svg>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: "4px solid #0b0b0c",
              background: "#ff3d9a",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {SITE.program}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 118, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4 }}>
          <span>LEARN TODAY.</span>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span
              style={{
                background: "#c6ff34",
                border: "5px solid #0b0b0c",
                borderRadius: 24,
                padding: "0 20px 8px",
                boxShadow: "10px 10px 0 #0b0b0c",
              }}
            >
              BUILD
            </span>
            <span>TOMORROW.</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600 }}>
          AI · Generative AI · Full Stack · Cloud · Software Development — 3-month internships
        </div>
      </div>
    ),
    size,
  );
}
