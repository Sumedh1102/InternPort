/** Dashboard navigation. Icons are referenced by name so server components can pass them to the client shell. */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const STUDENT_NAV: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", exact: true },
      { href: "/dashboard/learning", label: "Learning", icon: "BookOpen" },
      { href: "/dashboard/assignments", label: "Assignments", icon: "ClipboardList" },
      { href: "/dashboard/projects", label: "Projects", icon: "FolderGit2" },
      { href: "/dashboard/attendance", label: "Attendance", icon: "CalendarCheck" },
      { href: "/dashboard/resources", label: "Resources", icon: "Library" },
      { href: "/dashboard/announcements", label: "Announcements", icon: "Megaphone" },
      { href: "/dashboard/certificates", label: "Certificates", icon: "Award" },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/dashboard/assistant", label: "AI Assistant", icon: "Bot" },
      { href: "/dashboard/payment", label: "Payment status", icon: "Wallet" },
      { href: "/dashboard/profile", label: "Profile", icon: "UserRound" },
      { href: "/dashboard/support", label: "Support", icon: "LifeBuoy" },
    ],
  },
];

export const MENTOR_NAV: NavGroup[] = [
  {
    items: [
      { href: "/mentor", label: "Overview", icon: "LayoutDashboard", exact: true },
      { href: "/mentor/students", label: "Students", icon: "Users" },
      { href: "/mentor/assignments", label: "Assignments", icon: "ClipboardList" },
      { href: "/mentor/submissions", label: "Submissions", icon: "Inbox" },
      { href: "/mentor/attendance", label: "Attendance", icon: "CalendarCheck" },
      { href: "/mentor/sessions", label: "Sessions", icon: "Video" },
      { href: "/mentor/announcements", label: "Announcements", icon: "Megaphone" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/mentor/profile", label: "Profile", icon: "UserRound" }],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    items: [{ href: "/admin", label: "Overview", icon: "LayoutDashboard", exact: true }],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/admin/applications", label: "Applications", icon: "Inbox" },
      { href: "/admin/students", label: "Students & payments", icon: "Users" },
    ],
  },
  {
    label: "Programs",
    items: [
      { href: "/admin/programs", label: "Programs", icon: "GraduationCap" },
      { href: "/admin/batches", label: "Batches", icon: "Layers" },
      { href: "/admin/mentors", label: "Mentors", icon: "UserCog" },
    ],
  },
  {
    label: "Learning",
    items: [
      { href: "/admin/courses", label: "Courses & resources", icon: "BookOpen" },
      { href: "/admin/lessons", label: "Lessons", icon: "PlaySquare" },
      { href: "/admin/assignments", label: "Assignments", icon: "ClipboardList" },
      { href: "/admin/submissions", label: "Submissions", icon: "FileCheck" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/attendance", label: "Attendance", icon: "CalendarCheck" },
      { href: "/admin/projects", label: "Projects", icon: "FolderGit2" },
      { href: "/admin/certificates", label: "Certificates", icon: "Award" },
      { href: "/admin/announcements", label: "Announcements", icon: "Megaphone" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: "BarChart3" },
      { href: "/admin/settings", label: "Settings", icon: "Settings" },
    ],
  },
];
