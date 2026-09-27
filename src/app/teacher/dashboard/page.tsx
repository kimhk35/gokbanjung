import { Suspense } from "react";
import { TeacherPage } from "@/components/teacher/teacher";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <TeacherPage />
    </Suspense>
  );
}
