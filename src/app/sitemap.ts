import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";
import { getPublicPrograms } from "@/server/queries/programs";

export const revalidate = 3600;

const STATIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/internships", priority: 0.9, changeFrequency: "weekly" },
  { path: "/apply", priority: 0.8, changeFrequency: "monthly" },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/services", priority: 0.7, changeFrequency: "monthly" },
  { path: "/technology", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/projects", priority: 0.5, changeFrequency: "weekly" },
  { path: "/team", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/verify", priority: 0.3, changeFrequency: "yearly" },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: programs } = await getPublicPrograms();
  const now = new Date();
  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${SITE.url}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...programs.map((p) => ({
      url: `${SITE.url}/internships/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
