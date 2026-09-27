import { Suspense } from "react";
import { LearnPage } from "@/components/learning/learn";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <LearnPage />
    </Suspense>
  );
}
