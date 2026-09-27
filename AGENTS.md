<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# gokbanjung

곡반정와드 통합 학습 사이트. gospel-class(Next.js)를 뼈대로 comefollowme의 와드 일정·함께 생각하기를 옮겨 왔다.
와드 일정·함께 생각하기 코드는 `src/lib/ward-events.ts`, `src/lib/prompts.ts`, `src/lib/community-api.ts`에 있다.
DB는 기존 gospel-class Supabase를 함께 쓰므로 마이그레이션은 추가(additive)만 한다. 설계서: `docs/superpowers/specs/`.
