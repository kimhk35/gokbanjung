import { Suspense } from "react";
import { PresentationPage } from "@/components/teacher/presentation";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <PresentationPage />
    </Suspense>
  );
}
