/**
 * Brand + navigation configuration. Company facts here come only from the
 * product specification — no invented history, clients or statistics.
 */

export const SITE = {
  name: "Sainam Technology",
  shortName: "Sainam",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  description:
    "Sainam Technology builds software, AI/ML, web, mobile and cloud solutions — and runs hands-on technology internships. Winter Internship 2026 applications are open.",
  program: "Winter Internship 2026",
  programDuration: "3 Months",
  focusAreas: [
    "Software Development",
    "AI/ML",
    "Web Development",
    "Mobile Applications",
    "Cloud Solutions",
    "IT Consulting",
    "Technology Training",
    "Internship Programs",
  ],
} as const;

export const PUBLIC_NAV = [
  { href: "/internships", label: "Internships" },
  { href: "/services", label: "Services" },
  { href: "/technology", label: "Technology" },
  { href: "/projects", label: "Projects" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const FOOTER_NAV = {
  Company: [
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/technology", label: "Technology" },
    { href: "/team", label: "Team" },
    { href: "/projects", label: "Projects" },
    { href: "/contact", label: "Contact" },
  ],
  Internship: [
    { href: "/internships", label: "All programs" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/apply", label: "Apply now" },
    { href: "/verify", label: "Verify a certificate" },
  ],
  Platform: [
    { href: "/login", label: "Log in" },
    { href: "/register", label: "Create account" },
    { href: "/dashboard", label: "Student dashboard" },
  ],
} as const;

/**
 * Decorative hero badges. Rendered as original monogram stickers (no third-party logo
 * files are bundled); pass `logoSrc` to <TechBadge/> to use official brand assets
 * in line with each brand's usage guidelines.
 */
export const HERO_BADGES = [
  { name: "ChatGPT", glyph: "✳", tone: "paper" },
  { name: "Claude", glyph: "✺", tone: "pink" },
  { name: "Gemini", glyph: "✦", tone: "cyan" },
  { name: "Grok", glyph: "⌘", tone: "ink" },
  { name: "GitHub Copilot", glyph: "◎", tone: "paper" },
  { name: "Perplexity", glyph: "✱", tone: "lime" },
  { name: "Hugging Face", glyph: "☺", tone: "paper" },
  { name: "Meta Llama", glyph: "∞", tone: "blue" },
  { name: "Python", glyph: "Py", tone: "lime" },
  { name: "React", glyph: "⚛", tone: "cyan" },
  { name: "Next.js", glyph: "N", tone: "ink" },
  { name: "Node.js", glyph: "⬢", tone: "lime" },
  { name: "GitHub", glyph: "{ }", tone: "paper" },
  { name: "Docker", glyph: "▦", tone: "blue" },
  { name: "Cloud", glyph: "☁", tone: "pink" },
] as const;

export const TECH_MARQUEE = [
  "AI",
  "Machine Learning",
  "Generative AI",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Cloud",
  "GitHub",
  "Web Development",
  "Software Development",
] as const;
