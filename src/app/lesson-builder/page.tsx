import { Suspense } from "react";
import { LessonBuilder } from "@/components/teacher/lesson-builder";
export default function Page() {
  return (
    <Suspense>
      <LessonBuilder />
    </Suspense>
  );
}
