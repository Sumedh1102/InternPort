import { describe, expect, it } from "vitest";

import {
  canReadStorage,
  canWriteStorage,
  parseStorageFolder,
  parseStoragePath,
  safeFileName,
  splitStoragePath,
  storageFileUrl,
  supabasePathForLegacy,
  type StorageActor,
} from "@/lib/domain/storage";

const student: StorageActor = { uid: "stu1", role: "STUDENT" };
const other: StorageActor = { uid: "stu2", role: "STUDENT" };
const mentor: StorageActor = { uid: "men", role: "MENTOR" };
const admin: StorageActor = { uid: "adm", role: "ADMIN" };

const folder = (path: string) => {
  const parsed = parseStorageFolder(path);
  if (!parsed) throw new Error(`unparsed folder ${path}`);
  return parsed;
};

describe("storage paths", () => {
  it("parses every upload folder", () => {
    expect(folder("profile-images/stu1/")).toEqual({ area: "profile", uid: "stu1" });
    expect(folder("resumes/stu1/")).toEqual({ area: "resume", uid: "stu1" });
    expect(folder("internship-documents/users/stu1/projects/p1/")).toEqual({
      area: "project",
      uid: "stu1",
      projectId: "p1",
    });
    expect(folder("internship-documents/submissions/asg1_stu1/")).toEqual({
      area: "submission",
      submissionId: "asg1_stu1",
    });
    expect(folder("internship-documents/assignments/asg1/").area).toBe("assignment");
    expect(folder("internship-documents/programs/prog1/resources/").area).toBe("resource");
  });

  it("rejects unknown buckets, traversal and unsafe names", () => {
    expect(parseStorageFolder("resumes/stu1")).toBeNull();
    expect(parseStorageFolder("certificates/x/")).toBeNull();
    expect(parseStorageFolder("resumes/../stu2/")).toBeNull();
    expect(parseStoragePath("resumes/stu1/cv.pdf")).not.toBeNull();
    expect(parseStoragePath("resumes/stu1/../stu2/cv.pdf")).toBeNull();
    expect(parseStoragePath("resumes/stu1/..")).toBeNull();
    expect(parseStoragePath("resumes/stu1/a b.pdf")).toBeNull();
    expect(parseStoragePath("resumes//cv.pdf")).toBeNull();
  });

  it("splits bucket and key, and builds the app URL", () => {
    expect(splitStoragePath("resumes/stu1/1-cv.pdf")).toEqual({ bucket: "resumes", key: "stu1/1-cv.pdf" });
    expect(splitStoragePath("users/stu1/resume/cv.pdf")).toBeNull();
    expect(storageFileUrl("resumes/stu1/1-cv.pdf")).toBe("/api/files/resumes/stu1/1-cv.pdf");
  });

  it("makes file names safe", () => {
    expect(safeFileName("My CV (final).pdf")).toBe("My-CV-final-.pdf");
    expect(safeFileName("../../etc/passwd")).toBe("-.-etc-passwd");
    expect(safeFileName(".env")).toBe("env");
    expect(safeFileName("你好")).toBe("-");
    expect(safeFileName("")).toBe("file");
  });

  it("maps Firebase Storage paths to Supabase paths", () => {
    expect(supabasePathForLegacy("users/stu1/profile/1-me.png")).toBe("profile-images/stu1/1-me.png");
    expect(supabasePathForLegacy("users/stu1/resume/1-cv.pdf")).toBe("resumes/stu1/1-cv.pdf");
    expect(supabasePathForLegacy("users/stu1/projects/p1/1-shot.png")).toBe(
      "internship-documents/users/stu1/projects/p1/1-shot.png",
    );
    expect(supabasePathForLegacy("submissions/asg1_stu1/1-work.zip")).toBe(
      "internship-documents/submissions/asg1_stu1/1-work.zip",
    );
    expect(supabasePathForLegacy("assignments/asg1/1-brief.pdf")).toBe("internship-documents/assignments/asg1/1-brief.pdf");
    expect(supabasePathForLegacy("programs/prog1/resources/1-deck.pptx")).toBe(
      "internship-documents/programs/prog1/resources/1-deck.pptx",
    );
    expect(supabasePathForLegacy("resumes/stu1/1-cv.pdf")).toBeNull();
    expect(supabasePathForLegacy("certificates/x/c.pdf")).toBeNull();
  });
});

describe("storage access", () => {
  it("students write resumes, photos and screenshots to their own folders only", () => {
    expect(canWriteStorage(student, folder("resumes/stu1/"))).toBe(true);
    expect(canWriteStorage(student, folder("resumes/stu2/"))).toBe(false);
    expect(canWriteStorage(student, folder("profile-images/stu2/"))).toBe(false);
    expect(canWriteStorage(student, folder("internship-documents/users/stu2/projects/p1/"))).toBe(false);
    expect(canWriteStorage(admin, folder("resumes/stu1/"))).toBe(false);
  });

  it("binds submission folders to the uploader's uid", () => {
    expect(canWriteStorage(student, folder("internship-documents/submissions/asg1_stu1/"))).toBe(true);
    expect(canWriteStorage(student, folder("internship-documents/submissions/asg1_stu2/"))).toBe(false);
    expect(canWriteStorage({ uid: "1", role: "STUDENT" }, folder("internship-documents/submissions/asg_11/"))).toBe(false);
    expect(canReadStorage(other, folder("internship-documents/submissions/asg1_stu1/"))).toBe(false);
    expect(canReadStorage(mentor, folder("internship-documents/submissions/asg1_stu1/"))).toBe(true);
  });

  it("only staff upload assignment material; only admins upload program resources", () => {
    expect(canWriteStorage(student, folder("internship-documents/assignments/asg1/"))).toBe(false);
    expect(canWriteStorage(mentor, folder("internship-documents/assignments/asg1/"))).toBe(true);
    expect(canWriteStorage(mentor, folder("internship-documents/programs/prog1/resources/"))).toBe(false);
    expect(canWriteStorage(admin, folder("internship-documents/programs/prog1/resources/"))).toBe(true);
  });

  it("keeps private files private", () => {
    expect(canReadStorage(null, folder("resumes/stu1/"))).toBe(false);
    expect(canReadStorage(other, folder("resumes/stu1/"))).toBe(false);
    expect(canReadStorage(student, folder("resumes/stu1/"))).toBe(true);
    expect(canReadStorage(mentor, folder("resumes/stu1/"))).toBe(true);
    expect(canReadStorage(null, folder("internship-documents/assignments/asg1/"))).toBe(false);
    expect(canReadStorage(other, folder("internship-documents/assignments/asg1/"))).toBe(true);
  });
});
