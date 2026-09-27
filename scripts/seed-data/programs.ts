/**
 * Initial program configuration for the Winter Internship 2026, written to Firestore
 * by `npm run seed`. After seeding, Firestore is the source of truth and admins edit
 * everything in /admin/programs. Fees and duration come from the program brief;
 * curricula are a starting draft for the Sainam team to review.
 */

import type { ProgramInput } from "../../src/lib/domain/schemas";

const FEES = { earlyBird: 1500, regular: 1800 };

const ELIGIBILITY_BASE = [
  "Diploma, B.E., B.Tech, BCA or MCA students",
  "Computer Science, Computer Engineering, IT or other relevant computer/technology backgrounds",
];

const BENEFITS = [
  "Structured 3-month curriculum with weekly goals",
  "Mentor-reviewed assignments with written feedback",
  "Hands-on project work you can showcase on GitHub",
  "Live sessions and doubt-clearing with mentors",
  "Personal progress dashboard and AI learning assistant",
  "Verifiable digital certificate with QR code on completion",
];

const CERTIFICATE_INFO =
  "A digital certificate of completion is issued once you meet the program's completion criteria " +
  "(lessons, assignments, attendance and project). Every certificate has a unique ID and a QR code " +
  "that anyone can verify on the Sainam Technology website.";

const COMMON_FAQS = [
  {
    question: "How much does the internship cost?",
    answer:
      "Early bird pricing is ₹1,500 per month per course for the first 20 students. The regular price is ₹1,800 per month per course.",
  },
  {
    question: "How do I pay?",
    answer:
      "There is no online checkout. After your application is approved you'll receive payment instructions on your dashboard. Once you pay, submit your transaction reference and our team verifies it manually before activating your enrollment.",
  },
  {
    question: "Who can apply?",
    answer:
      "Diploma, B.E., B.Tech, BCA and MCA students from Computer Science, Computer Engineering, IT and related technology backgrounds.",
  },
  {
    question: "Do I get a certificate?",
    answer:
      "Yes — once you complete the program criteria you receive a digital certificate with a unique ID and QR verification.",
  },
];

type Seed = Omit<ProgramInput, "fees" | "eligibility" | "benefits" | "certificateInfo" | "faqs" | "status" | "durationMonths" | "durationLabel" | "mode"> & {
  extraEligibility: string[];
  extraFaqs?: { question: string; answer: string }[];
};

const PROGRAMS: Seed[] = [
  {
    slug: "ai-machine-learning",
    name: "AI & Machine Learning",
    domain: "AI & Machine Learning",
    tagline: "From Python and data to models that learn.",
    description:
      "Build a solid foundation in machine learning: Python for data work, core ML algorithms, model evaluation and an introduction to deep learning. You'll finish by building and documenting an end-to-end ML project.",
    skills: ["Python", "NumPy & pandas", "Data visualisation", "Supervised learning", "Model evaluation", "Neural network basics"],
    technologies: ["Python", "Jupyter", "NumPy", "pandas", "scikit-learn", "Matplotlib", "PyTorch", "Git & GitHub"],
    curriculum: [
      { title: "Python for data", topics: ["Python refresher", "NumPy arrays", "pandas DataFrames", "Data cleaning"] },
      { title: "Exploratory data analysis", topics: ["Descriptive statistics", "Visualisation with Matplotlib", "Feature engineering"] },
      { title: "Core machine learning", topics: ["Regression", "Classification", "Decision trees & ensembles", "Clustering"] },
      { title: "Evaluation & tuning", topics: ["Train/test splits", "Cross-validation", "Metrics", "Hyperparameter tuning"] },
      { title: "Deep learning intro", topics: ["Neural networks", "PyTorch basics", "Training loops"] },
      { title: "Capstone project", topics: ["Problem framing", "Model building", "Documentation & presentation"] },
    ],
    roadmap: [
      { week: "Week 1", title: "Fundamentals", description: "Python refresher, tooling and working with data." },
      { week: "Week 2", title: "Core technologies", description: "NumPy, pandas and exploratory data analysis." },
      { week: "Week 3–4", title: "Machine learning", description: "Regression, classification and model evaluation." },
      { week: "Week 5–8", title: "Advanced concepts", description: "Ensembles, tuning, and an introduction to deep learning." },
      { week: "Week 9–12", title: "Project work", description: "Build, evaluate and present an end-to-end ML project." },
    ],
    accent: "lime",
    order: 1,
    extraEligibility: ["Basic programming knowledge (any language) is helpful"],
  },
  {
    slug: "generative-ai",
    name: "Generative AI",
    domain: "Generative AI",
    tagline: "Build real applications on top of large language models.",
    description:
      "Learn how modern generative AI works and how to build with it responsibly: prompting, LLM APIs, retrieval-augmented generation, tool use and evaluation. You'll ship a working GenAI application as your project.",
    skills: ["Prompt engineering", "LLM APIs", "Embeddings & vector search", "RAG", "Tool use / agents", "Evaluation & safety"],
    technologies: ["Python", "LLM APIs", "Embeddings", "Vector databases", "Hugging Face", "FastAPI", "Git & GitHub"],
    curriculum: [
      { title: "How generative models work", topics: ["Tokens & context windows", "Transformers at a glance", "Capabilities & limits"] },
      { title: "Prompting", topics: ["Prompt patterns", "Structured outputs", "Few-shot examples"] },
      { title: "Building with LLM APIs", topics: ["API basics", "Streaming", "Cost & latency"] },
      { title: "Retrieval-augmented generation", topics: ["Embeddings", "Chunking", "Vector search", "Grounded answers"] },
      { title: "Tools & agents", topics: ["Function calling", "Multi-step workflows", "Guardrails"] },
      { title: "Evaluation & responsible AI", topics: ["Testing LLM apps", "Hallucinations", "Privacy & safety"] },
    ],
    roadmap: [
      { week: "Week 1", title: "Fundamentals", description: "How LLMs work and effective prompting." },
      { week: "Week 2", title: "Core technologies", description: "LLM APIs, streaming and structured outputs." },
      { week: "Week 3–4", title: "RAG", description: "Embeddings, vector search and grounded answers." },
      { week: "Week 5–8", title: "Advanced concepts", description: "Tool use, agents, evaluation and safety." },
      { week: "Week 9–12", title: "Project work", description: "Design and ship a generative AI application." },
    ],
    accent: "pink",
    order: 2,
    extraEligibility: ["Comfort with Python basics is recommended"],
  },
  {
    slug: "full-stack-development",
    name: "Full Stack Development",
    domain: "Full Stack Development",
    tagline: "Frontend, backend, database — ship the whole thing.",
    description:
      "Go from HTML to a deployed full-stack application. Learn React and Next.js on the frontend, Node.js APIs on the backend, databases, authentication and deployment, then build a complete product as your project.",
    skills: ["HTML, CSS & JavaScript", "React", "Next.js", "REST APIs", "Databases", "Authentication", "Deployment"],
    technologies: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "SQL/NoSQL", "Git & GitHub"],
    curriculum: [
      { title: "Web foundations", topics: ["HTML & semantic markup", "Modern CSS & layout", "JavaScript essentials"] },
      { title: "Frontend with React", topics: ["Components & props", "State & effects", "Forms", "Routing"] },
      { title: "Next.js", topics: ["App Router", "Server & client components", "Data fetching"] },
      { title: "Backend with Node.js", topics: ["REST API design", "Express", "Validation", "Error handling"] },
      { title: "Data & auth", topics: ["Data modelling", "SQL vs NoSQL", "Authentication", "Authorization"] },
      { title: "Shipping", topics: ["Testing basics", "Deployment", "Performance"] },
    ],
    roadmap: [
      { week: "Week 1", title: "Fundamentals", description: "HTML, CSS, JavaScript and Git." },
      { week: "Week 2", title: "Core technologies", description: "React components, state and forms." },
      { week: "Week 3–4", title: "Backend", description: "Node.js APIs, databases and authentication." },
      { week: "Week 5–8", title: "Advanced concepts", description: "Next.js, full-stack patterns, testing and deployment." },
      { week: "Week 9–12", title: "Project work", description: "Build and deploy a complete full-stack application." },
    ],
    accent: "cyan",
    order: 3,
    extraEligibility: ["No prior web experience required — basic programming helps"],
  },
  {
    slug: "frontend-development",
    name: "Frontend Development",
    domain: "Frontend Development",
    tagline: "Interfaces that are fast, accessible and beautiful.",
    description:
      "Master modern frontend engineering: semantic HTML, responsive CSS, JavaScript, TypeScript, React and Next.js, with a strong focus on accessibility, performance and design systems.",
    skills: ["Semantic HTML", "Responsive CSS", "JavaScript & TypeScript", "React", "Accessibility", "Performance"],
    technologies: ["HTML", "CSS", "Tailwind CSS", "JavaScript", "TypeScript", "React", "Next.js", "Git & GitHub"],
    curriculum: [
      { title: "HTML & CSS", topics: ["Semantic HTML", "Flexbox & Grid", "Responsive design", "Tailwind CSS"] },
      { title: "JavaScript", topics: ["Language essentials", "DOM", "Async & fetch"] },
      { title: "TypeScript", topics: ["Types", "Interfaces", "Typing React"] },
      { title: "React", topics: ["Components", "State management", "Forms & validation"] },
      { title: "Next.js & quality", topics: ["Routing", "Rendering strategies", "Accessibility", "Web performance"] },
    ],
    roadmap: [
      { week: "Week 1", title: "Fundamentals", description: "Semantic HTML and modern CSS layout." },
      { week: "Week 2", title: "Core technologies", description: "JavaScript and the DOM." },
      { week: "Week 3–4", title: "React", description: "Components, state and TypeScript." },
      { week: "Week 5–8", title: "Advanced concepts", description: "Next.js, accessibility, performance and design systems." },
      { week: "Week 9–12", title: "Project work", description: "Build a polished, responsive web application." },
    ],
    accent: "blue",
    order: 4,
    extraEligibility: ["No prior experience required"],
  },
  {
    slug: "backend-development",
    name: "Backend Development",
    domain: "Backend Development",
    tagline: "APIs, databases and the systems behind the screen.",
    description:
      "Learn to design and build reliable backend services: HTTP and REST, Node.js, databases, authentication, caching, testing and containerised deployment.",
    skills: ["HTTP & REST", "Node.js", "Database design", "Authentication", "Testing", "Docker basics"],
    technologies: ["Node.js", "TypeScript", "Express", "PostgreSQL", "MongoDB", "Redis", "Docker", "Git & GitHub"],
    curriculum: [
      { title: "Backend foundations", topics: ["How the web works", "HTTP", "REST principles"] },
      { title: "Node.js APIs", topics: ["Express", "Routing & middleware", "Validation"] },
      { title: "Databases", topics: ["Relational modelling", "SQL", "NoSQL", "ORMs"] },
      { title: "Security", topics: ["Authentication", "Authorization", "Common vulnerabilities"] },
      { title: "Production readiness", topics: ["Testing", "Caching", "Logging", "Docker"] },
    ],
    roadmap: [
      { week: "Week 1", title: "Fundamentals", description: "HTTP, REST and Node.js basics." },
      { week: "Week 2", title: "Core technologies", description: "Building APIs with Express and validation." },
      { week: "Week 3–4", title: "Data", description: "Relational and document databases." },
      { week: "Week 5–8", title: "Advanced concepts", description: "Security, testing, caching and Docker." },
      { week: "Week 9–12", title: "Project work", description: "Design and deploy a production-style API." },
    ],
    accent: "lime",
    order: 5,
    extraEligibility: ["Basic programming knowledge recommended"],
  },
  {
    slug: "cloud-technologies",
    name: "Cloud Technologies",
    domain: "Cloud Technologies",
    tagline: "Deploy, scale and operate apps in the cloud.",
    description:
      "Understand cloud fundamentals and hands-on deployment: Linux, networking basics, containers, managed services, CI/CD and cost-aware architecture.",
    skills: ["Cloud fundamentals", "Linux", "Networking basics", "Docker", "CI/CD", "Infrastructure basics"],
    technologies: ["Linux", "Docker", "GitHub Actions", "Cloud platforms", "Serverless", "Git & GitHub"],
    curriculum: [
      { title: "Cloud fundamentals", topics: ["Service models", "Regions & availability", "Shared responsibility"] },
      { title: "Linux & networking", topics: ["Shell", "Permissions", "DNS & HTTP", "SSH"] },
      { title: "Containers", topics: ["Docker images", "Compose", "Registries"] },
      { title: "Deploying apps", topics: ["Compute options", "Serverless", "Managed databases", "Storage"] },
      { title: "Automation", topics: ["CI/CD pipelines", "Infrastructure as code basics", "Monitoring & cost"] },
    ],
    roadmap: [
      { week: "Week 1", title: "Fundamentals", description: "Cloud concepts, Linux and networking basics." },
      { week: "Week 2", title: "Core technologies", description: "Containers with Docker." },
      { week: "Week 3–4", title: "Deployment", description: "Compute, storage and managed services." },
      { week: "Week 5–8", title: "Advanced concepts", description: "CI/CD, infrastructure as code and monitoring." },
      { week: "Week 9–12", title: "Project work", description: "Deploy and operate a real application in the cloud." },
    ],
    accent: "cyan",
    order: 6,
    extraEligibility: ["Familiarity with any programming language is helpful"],
  },
  {
    slug: "software-development",
    name: "Software Development",
    domain: "Software Development",
    tagline: "Engineering fundamentals that make you ship better code.",
    description:
      "Strengthen core software engineering skills: programming fundamentals, data structures and algorithms, object-oriented design, version control, testing and teamwork on a real project.",
    skills: ["Programming fundamentals", "Data structures", "Algorithms", "OOP & design", "Testing", "Git workflows"],
    technologies: ["Python", "Java", "Git & GitHub", "Unit testing", "SQL", "VS Code"],
    curriculum: [
      { title: "Programming fundamentals", topics: ["Control flow", "Functions", "Debugging"] },
      { title: "Data structures & algorithms", topics: ["Arrays & strings", "Lists, stacks & queues", "Trees & graphs", "Complexity"] },
      { title: "Object-oriented design", topics: ["Classes & objects", "SOLID principles", "Design patterns intro"] },
      { title: "Engineering practice", topics: ["Git workflows", "Code review", "Unit testing", "Clean code"] },
      { title: "Team project", topics: ["Requirements", "Planning", "Delivery"] },
    ],
    roadmap: [
      { week: "Week 1", title: "Fundamentals", description: "Programming fundamentals and tooling." },
      { week: "Week 2", title: "Core technologies", description: "Core data structures and Git workflows." },
      { week: "Week 3–4", title: "Algorithms", description: "Algorithms and complexity." },
      { week: "Week 5–8", title: "Advanced concepts", description: "OOP, design patterns, testing and clean code." },
      { week: "Week 9–12", title: "Project work", description: "Build a software project with reviews and tests." },
    ],
    accent: "pink",
    order: 7,
    extraEligibility: ["Open to all technology students"],
  },
];

export const SEED_PROGRAMS: ProgramInput[] = PROGRAMS.map(({ extraEligibility, extraFaqs, ...p }) => ({
  ...p,
  durationMonths: 3,
  durationLabel: "3 Months",
  mode: "Announced with batch schedule",
  fees: FEES,
  eligibility: [...ELIGIBILITY_BASE, ...extraEligibility],
  benefits: BENEFITS,
  certificateInfo: CERTIFICATE_INFO,
  faqs: [...COMMON_FAQS, ...(extraFaqs ?? [])],
  status: "PUBLISHED",
}));
