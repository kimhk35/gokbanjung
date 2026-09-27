import { Suspense } from "react";
import { HomePage } from "@/components/learning/home";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <HomePage />
    </Suspense>
  );
}
