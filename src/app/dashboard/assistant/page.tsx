import { AssistantChat } from "@/components/dashboard/assistant-chat";
import { Locked, PageHeader } from "@/components/dashboard/ui";
import { Alert } from "@/components/ui/feedback";
import { firstName } from "@/lib/utils";
import { getAIProvider } from "@/server/ai";
import { requireRole } from "@/server/auth/session";
import { getAssignmentsForEnrollment, getCourses, getLessons, orderLessons } from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage({ searchParams }: PageProps<"/dashboard/assistant">) {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  const { lesson, assignment } = await searchParams;
  const header = (
    <PageHeader
      kicker="AI learning assistant"
      title="Ask, learn, build."
      description="Context-aware help with concepts, code and errors — hints first, never ready-made answers."
    />
  );
  if (!ctx.active || !ctx.enrollment) {
    return (
      <>
        {header}
        <Locked title="Unlocks with your enrollment">The assistant becomes available once your enrollment is active.</Locked>
      </>
    );
  }
  const settings = await getSettings();
  if (!settings.ai.enabled || !getAIProvider()) {
    return (
      <>
        {header}
        <Alert tone="info" title="The AI assistant isn't enabled yet">
          Sainam Technology hasn&apos;t switched on the assistant for this platform. Your mentor is always available for help.
        </Alert>
      </>
    );
  }
  const e = ctx.enrollment;
  const [courses, lessons, assignments] = await Promise.all([
    getCourses(e.programId, true),
    getLessons(e.programId, true),
    getAssignmentsForEnrollment(e),
  ]);
  const ordered = orderLessons(courses, lessons);
  const lessonId = typeof lesson === "string" && ordered.some((l) => l.id === lesson) ? lesson : undefined;
  const assignmentId = typeof assignment === "string" && assignments.some((a) => a.id === assignment) ? assignment : undefined;
  return (
    <>
      {header}
      <AssistantChat
        firstName={firstName(ctx.user.name)}
        lessons={ordered.map((l) => ({ id: l.id, title: l.title }))}
        assignments={assignments.map((a) => ({ id: a.id, title: a.title }))}
        initialLessonId={lessonId}
        initialAssignmentId={assignmentId}
      />
    </>
  );
}
