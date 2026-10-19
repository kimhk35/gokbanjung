<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# gokbanjung

곡반정와드 통합 학습 사이트. gospel-class(Next.js)를 뼈대로 comefollowme의 와드 일정·함께 생각하기를 옮겨 왔다.
와드 일정·함께 생각하기 코드는 `src/lib/ward-events.ts`, `src/lib/prompts.ts`, `src/lib/community-api.ts`에 있다.
DB는 기존 gospel-class Supabase를 함께 쓰므로 마이그레이션은 추가(additive)만 한다. 설계서: `docs/superpowers/specs/`.

## Collaboration additions (2026-10-04)

These sections add to the existing instructions above; preserve the Next.js block,
project history, and earlier developer guidance. Adapted from the working practices
in Bright Unified's `AGENTS.md`, without importing its business rules or tooling.

### Preserve existing work

- Inspect Git status before editing. Keep unrelated changes and existing features.
- Extend this file when adding our guidance; do not replace earlier sections or
  regenerate it wholesale. Resolve actual conflicts explicitly in task context.
- Read the relevant design in `docs/superpowers/specs/` before substantial changes.
  Distinguish implemented behavior, design intent, and new proposals.
- Review `docs/working/AGENT_HANDOFF.md` when continuing this integration work.
  Reuse verified findings while relevant source and environment remain unchanged.

### Efficient execution and delegation

- Preserve the user's selected lead model and reasoning level. Assess scope,
  dependencies, risk, and necessary verification before starting.
- Optimize total work and usage. Avoid overlapping searches and repeated reviews.
- Use no subagent for trivial or fully sequential tasks. Delegate substantial
  independent work when it saves total effort or materially improves quality.
  Default to at most one; use more only for distinct, justified workstreams,
  never more than three concurrent subagents including descendants.
- Give each agent a bounded deliverable, relevant context, file ownership when
  editing, constraints, and completion criteria. Request findings, not raw logs.
- Choose an available model and reasoning level appropriate to delegated work;
  verify availability rather than copying stale model names from another project.
- The lead integrates results, resolves conflicts, performs relevant checks, and
  owns the final report. Keep lead work complementary to delegated work.
- Search narrowly with `rg`; exclude dependencies, build output, and unrelated
  worktrees. Batch independent reads and keep dependent mutations sequential.
- Continue authorized work without repeated confirmation. Ask only when missing
  information or authorization actually blocks the next consequential step.

### Product direction: reading and sharing

The user's main concern is losing the immediate connection between reading a
Come, Follow Me passage and sharing a thought when the main action opens the
Church website. Users also want less content at once and easy question links.

- Prioritize continuity of reading and responding. Reuse the existing in-app
  lesson reader, anchored notes, and public prompt flow before adding systems.
- Verify published lesson-text availability before routing readers to it.
  Keep the official source accessible; provide a clear fallback when local text
  is absent. Do not imply that a source link automatically imports the manual.
- Preserve source attribution and the existing content publication requirements.
- Prefer one clear next action and reveal supporting material on demand.
  Keep advanced study and teacher tools contextual rather than crowding home.
- Make the intended shared-question experience: open link, see question/context,
  write one thought, post. Preserve optional names, drafts, and clear feedback.
- For passage comments, retain the selected quote and reading position; on mobile
  the composer should be reachable immediately without traversing the whole text.
- Keep private reflections, class discussions, and public comments distinct in
  visibility and permissions even when their entry points become consistent.
- Product priorities are design guidance, not blanket authorization to publish,
  migrate production data, or implement every proposal in a handoff.

### Project map and data boundaries

- Home and navigation: `src/components/learning/home.tsx`,
  `src/components/shell.tsx`.
- Week/day learning: `src/components/learning/learn.tsx` and `week-voices.tsx`.
- In-app lesson text: `src/components/notes/lesson-text-view.tsx`,
  `lesson-text-editor.tsx`, `src/lib/lesson-texts.ts`.
- Questions and public links: `src/components/think/`, `src/app/p/[slug]/`,
  `src/lib/prompts.ts`, `src/lib/community-api.ts`.
- Scripture reading and notes: `src/components/learning/chapter-view.tsx`,
  `src/components/notes/verse-notes.tsx`, `src/lib/scripture-text.ts`.
- Ward events: `src/components/ward/`, `src/lib/ward-events.ts`.
- Access and identity: `src/lib/access.ts`, `src/lib/auth.ts`,
  `src/components/provider.tsx`, `src/components/account.tsx`.
- The shared gospel-class Supabase database requires additive migrations.
  Preserve existing records, policies, public/private boundaries, and identity.
- Keep privileged keys and database credentials server-side. Never print or
  include secrets or private member content in reports, browser bundles, or Git.
- Sibling applications are references unless the task explicitly includes edits
  there. Verify staging/canonical provenance before claiming cross-project parity.

### Verification and completion

- Choose checks by changed behavior and risk. Documentation-only edits need a
  diff/link review, not application tests solely for paperwork.
- For code changes, run relevant tests; use `npm test`, `npm run lint`, and
  `npm run build` as appropriate to scope and release requirements. Consult the
  installed Next.js guides as required by the original instructions above.
- For reading/sharing UI changes, verify direct shared-link entry, guest flow,
  selected-passage context, draft recovery, keyboard/touch behavior, and public
  versus private visibility at phone and desktop widths.
- Distinguish source inspection, browser emulation, physical-device testing, and
  live production verification. Never report one as another.
- Reuse passing checks for unchanged inputs. Repeat or broaden when relevant
  changes, failures, or unresolved concerns justify it.
- Before a requested commit/push/deployment, verify the target repository/branch,
  local Git author identity, and applicable checks. Do not copy another project's
  identity settings or change global configuration as part of routine setup.
- Report what changed, why, checks actually performed, limitations, and remaining
  work. Keep optional improvements separate from completed requirements.

### Lightweight continuity

- Before adding or changing a seven-day Come, Follow Me allocation, read
  `docs/study/cfm-distribution-method.md`. Preserve the complete source inventory,
  scripture/talk bodies and notes within its declared scope; verify no missing
  or duplicate units and actual blue-range boundaries. Record unverified weeks
  and language-specific anchors explicitly rather than implying coverage.

- Keep durable constraints here and task findings in `docs/working/` or the
  existing design/plan directories. Keep handoffs concise and source-linked.
- Record decisions, evidence, uncertainties, checks, and the next useful step;
  preserve still-relevant earlier findings when updating a handoff.
- Bright Navigator capture/retrieval is not set up in this repository. Do not
  claim capture gates passed, install it implicitly, or copy corpus-specific
  commands from Bright Unified. Use ordinary project notes until setup is
  explicitly requested. Avoid raw chat transcripts or extra tests just for logs.
