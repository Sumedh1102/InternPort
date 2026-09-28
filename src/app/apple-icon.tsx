import { ImageResponse } from "next/og";

import { BRAND_COLORS, LOGO_MARK, LOGO_MARK_PATH } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon: the mark on white (iOS fills transparency with black and rounds the corners itself). */
export default function AppleIcon() {
  const height = 120;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg
          width={(height * LOGO_MARK.width) / LOGO_MARK.height}
          height={height}
          viewBox={`0 0 ${LOGO_MARK.width} ${LOGO_MARK.height}`}
        >
          <path d={LOGO_MARK_PATH} fill={BRAND_COLORS.teal} />
        </svg>
      </div>
    ),
    size,
  );
}
