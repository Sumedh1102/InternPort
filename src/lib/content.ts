/**
 * Marketing copy for public pages. Describes Sainam Technology's stated focus areas
 * only — no invented clients, history, testimonials or statistics.
 * Program data (fees, curricula…) is NOT here: it lives in Firestore.
 */

export const SERVICES = [
  {
    key: "software",
    title: "Software Development",
    icon: "Code",
    blurb: "Custom software designed around your workflows — from first prototype to maintainable production systems.",
    points: ["Requirement analysis & architecture", "Custom applications", "Maintenance & modernisation"],
  },
  {
    key: "ai-ml",
    title: "AI / ML",
    icon: "BrainCircuit",
    blurb: "Machine learning and generative AI solutions that turn data and language models into useful product features.",
    points: ["Data analysis & ML models", "Generative AI & LLM integration", "Intelligent automation"],
  },
  {
    key: "web",
    title: "Web Development",
    icon: "Globe",
    blurb: "Fast, accessible, responsive websites and web applications built on modern frameworks.",
    points: ["Websites & web apps", "Frontend & backend engineering", "Performance & accessibility"],
  },
  {
    key: "mobile",
    title: "Mobile Applications",
    icon: "Smartphone",
    blurb: "Mobile experiences for Android and iOS that feel native and stay easy to maintain.",
    points: ["Cross-platform apps", "API integration", "App store readiness"],
  },
  {
    key: "cloud",
    title: "Cloud Solutions",
    icon: "Cloud",
    blurb: "Cloud architecture, deployment and automation so your applications scale reliably.",
    points: ["Cloud deployment", "CI/CD & automation", "Cost-aware architecture"],
  },
  {
    key: "consulting",
    title: "IT Consulting",
    icon: "Handshake",
    blurb: "Practical technology guidance — choosing the right stack, planning roadmaps and de-risking projects.",
    points: ["Technology strategy", "Stack & vendor selection", "Project planning"],
  },
  {
    key: "training",
    title: "Technology Training",
    icon: "GraduationCap",
    blurb: "Hands-on training in modern technologies, taught through building rather than slides.",
    points: ["AI & data", "Web & cloud", "Developer tooling"],
  },
  {
    key: "internships",
    title: "Internship Programs",
    icon: "Rocket",
    blurb: "Structured, mentor-led internships where students learn by shipping real projects.",
    points: ["3-month programs", "Mentor reviews", "Verifiable certificates"],
  },
] as const;

export const TECH_STACK = [
  {
    group: "AI & Machine Learning",
    tone: "lime",
    items: ["Python", "NumPy", "pandas", "scikit-learn", "PyTorch", "Jupyter"],
  },
  {
    group: "Generative AI",
    tone: "pink",
    items: ["LLM APIs", "Prompt engineering", "Embeddings", "Vector search", "RAG", "Hugging Face"],
  },
  {
    group: "Frontend",
    tone: "cyan",
    items: ["HTML & CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"],
  },
  {
    group: "Backend",
    tone: "lime",
    items: ["Node.js", "Express", "REST APIs", "PostgreSQL", "MongoDB", "Firebase"],
  },
  {
    group: "Cloud & DevOps",
    tone: "blue",
    items: ["Linux", "Docker", "CI/CD", "GitHub Actions", "Serverless", "Cloud platforms"],
  },
  {
    group: "Developer workflow",
    tone: "pink",
    items: ["Git", "GitHub", "Code review", "Testing", "VS Code", "AI coding assistants"],
  },
] as const;

export const JOURNEY = [
  { title: "Browse internships", body: "Explore the seven Winter Internship 2026 domains and pick the one that fits you." },
  { title: "Create your account", body: "Sign up with email or Google and verify your email address." },
  { title: "Fill the application", body: "Tell us about your academics, skills, links and why you want to join." },
  { title: "Admin review", body: "The Sainam team reviews every application and approves or follows up with you." },
  { title: "Payment instructions", body: "Approved students see payment instructions on their dashboard — no online checkout." },
  { title: "Manual verification", body: "Pay offline, submit your transaction reference and our team verifies it by hand." },
  { title: "Enrollment activated", body: "You're assigned a batch and mentor, and your learning dashboard unlocks." },
  { title: "Learn, build, certify", body: "Complete lessons, assignments and a project to earn a verifiable certificate." },
] as const;

export const WHY = [
  { title: "Project-first learning", body: "Every program ends in a real project you can show on GitHub.", icon: "FolderGit2" },
  { title: "Mentor feedback", body: "Assignments and projects are reviewed and scored by mentors.", icon: "MessageSquare" },
  { title: "AI learning assistant", body: "A context-aware assistant that gives hints and explanations — not ready-made answers.", icon: "Bot" },
  { title: "Transparent progress", body: "Lessons, assignments, attendance and project status in one dashboard.", icon: "LayoutDashboard" },
  { title: "Verifiable certificates", body: "Each certificate has a unique ID and QR code anyone can verify.", icon: "QrCode" },
  { title: "Simple enrollment", body: "Clear steps from application to activation — with human verification.", icon: "ShieldCheck" },
] as const;

export const GENERAL_FAQ = [
  {
    question: "How long is the Winter Internship 2026?",
    answer: "Every program runs for 3 months.",
  },
  {
    question: "What does it cost?",
    answer:
      "Early bird pricing is ₹1,500 per month per course, available to the first 20 students only. The regular price is ₹1,800 per month per course. Exact fees for each program are shown on its page.",
  },
  {
    question: "Is there an online payment?",
    answer:
      "No. Version 1 of the platform does not take online payments. After approval you'll get payment instructions, pay through the process shared by Sainam Technology, and submit your reference number for manual verification.",
  },
  {
    question: "Who is eligible?",
    answer:
      "Diploma, B.E., B.Tech, BCA and MCA students from Computer Science, Computer Engineering, IT and other relevant computer/technology backgrounds.",
  },
  {
    question: "Do I need to create an account to apply?",
    answer:
      "Yes. Your account lets you track your application, see payment instructions and access your learning dashboard once enrolled.",
  },
  {
    question: "Will I get a certificate?",
    answer:
      "Yes — after meeting the completion criteria you receive a digital certificate with a unique ID and QR verification page.",
  },
  {
    question: "Does the internship guarantee a job?",
    answer:
      "No. The internship is focused on skills and project experience. We never promise placements or jobs.",
  },
] as const;
