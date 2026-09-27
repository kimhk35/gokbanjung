import { Suspense } from "react";
import { ScriptureReader } from "@/components/learning/scriptures";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <ScriptureReader />
    </Suspense>
  );
}
