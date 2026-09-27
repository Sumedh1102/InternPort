import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2 } from "lucide-react";

import { CtaBand } from "@/components/site/blocks";
import { ProjectCard } from "@/components/site/cards";
import { Container, PageHero } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import type { Project } from "@/lib/domain/types";
import { isAdminConfigured } from "@/server/firebase-admin";
import { getFeaturedProjects } from "@/server/queries/platform";

export const metadata: Metadata = {
  title: "Projects",
  description: "Projects built during Sainam Technology internships, featured with the students' consent.",
  alternates: { canonical: "/projects" },
};

export const revalidate = 600;

export default async function ProjectsPage() {
  let projects: Project[] = [];
  if (isAdminConfigured()) {
    try {
      projects = await getFeaturedProjects();
    } catch (error) {
      console.error("[projects] failed to load", error);
    }
  }

  return (
    <>
      <PageHero
        kicker="Projects"
        title="Shipped by"
        highlight="interns."
        description="Every internship ends with a real project, reviewed and evaluated by mentors. Selected projects are showcased here."
      />
      <section className="py-16 sm:py-24">
        <Container>
          {projects.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<FolderGit2 />}
              title="The showcase opens with the first cohort"
              description="Projects from the Winter Internship 2026 will appear here once they are completed and evaluated."
              action={
                <Link href="/internships" className={buttonVariants({ size: "sm" })}>
                  Explore internships
                </Link>
              }
            />
          )}
        </Container>
      </section>
      <CtaBand title="Your project could be next." />
    </>
  );
}
