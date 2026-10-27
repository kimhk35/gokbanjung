# Integration review and working handoff

Date: 2026-10-04 (Asia/Seoul)

## Scope and status

The user requested a comparison of 곡반정와드 and the sibling 와서나를따르라
application, emphasizing less visual overload, easier thoughts/comments, and
questions distributed by link. They clarified that the primary concern is leaving
the integrated app for the official Come, Follow Me manual, which separates reading
from immediate sharing. They then prioritized additive agent documentation based
on Bright Unified while preserving all previous developer instructions and findings.

The comparison below is source-based. No application changes, database changes,
commits, or deployments were made for this review. Live content coverage and the
production experience have not been verified. The proposed interaction preview is
a concept with sample content, not an implemented application screen.

## Documentation setup

- Existing `AGENTS.md` contained the generated Next.js guidance and project notes.
  Git history includes commits `80f9e44` and `a3b92f6`, attributed to 김홍겸.
  Attribution identifies the recorded author, not how the prose was produced.
- Added collaboration sections without replacing earlier text. A byte-prefix
  comparison confirmed all original 1,127 bytes were unchanged.
- Reference: `C:/Users/roger/OneDrive/Desktop/Workspace/bright_unified/AGENTS.md`.
  Adapted efficient delegation, evidence reuse, proportionate verification,
  preservation, and continuity. Bright-specific business rules, Git identity,
  model names, and Navigator capture infrastructure were not transplanted.
- This handoff retains the comparison and recommendations so the documentation
  task does not discard the earlier work. Recommendations remain proposals.

## Comparison

The sibling implementation reviewed is under
`../와서나를따르라/comefollowme/`. Its outer `AGENTS.md` calls this a staging
copy and identifies `C:/Users/roger/OneDrive/Desktop/Workspace/comefollowme`
as canonical. Findings describe the requested local copy, not production parity.

| Area | 와서 나를 따르라 local implementation | 곡반정 current implementation | Recommended integration |
| --- | --- | --- | --- |
| Reading and responding | Prepared lesson paragraphs with nearby insight actions; registered references open in a local drawer. | Main week/day manual actions open the official website; a separate internal lesson reader already supports selected-text notes. | Make available internal reading the primary journey and keep the composer near the passage. |
| Question links | `/p/<slug>`, anonymous replies, local drafts, reactions and comments. | These capabilities already exist at `/p/[slug]`. | Improve focus and publishing-to-sharing, rather than rebuild them. |
| Home/navigation | Task-focused lesson/calendar/question/journal navigation; still some dense reading/question screens. | Daily insight, hero, weekly feature, recommendations, discovery cards and community sections compete for attention. | One primary action with compact current question/study/event context; disclose the rest. |
| Teacher preparation | Selected passage can prefill a new question; prepared/imported lesson text stays local. | Prompt editor can prefill lesson/reference; text paste/preview/publish and advanced teaching tools already exist. | Connect selected passage or recommended question to a minimal editor, then a ready-to-share link. |
| Sharing destinations | Contextual thoughts with public/private choices. | Think-together, wall, discussion, verse/text notes and private reflections coexist. | Consistent entry/composer and explicit visibility while keeping permissions and data distinct. |
| Ward calendar | Saved layout and multi-organization preferences. | Month/list views, organization filters, posters, editing and public event links already ported. | Preserve capabilities; later persist audience preferences and show the next relevant event. |

## Main finding: an existing reader is not the main journey

The user's concern is supported by the source. Week/day actions open the official
manual in a new tab (`src/components/learning/learn.tsx:280,471`). The local reader
entry sits farther down inside WeekVoices
(`src/components/learning/week-voices.tsx:40`).

The integrated `/week/[number]/text` route already supports published Markdown,
private highlights, selected-passage public comments, reactions, threads, and
drafts (`src/components/notes/lesson-text-view.tsx:120,241,335`). On mobile the
composer is after the full article; starting a note does not focus/scroll it.
The side-by-side layout begins at 768px (`src/app/community.css:1017`). This
mobile friction is inferred from component order/CSS, not a device test.

The sibling's advantage is its normal reading path: paragraph-level insight
buttons and anchored selections (`comefollowme/src/app.js:126,174`), plus a
reference drawer backed by bundled/registered content (`src/library.js:115`,
`src/enhancements.js:20`). It does not simply embed the official site in an iframe.

Local lesson coverage is a real dependency. 곡반정 requires teacher/admin text
preparation with source URL and publication-rights confirmation
(`src/components/notes/lesson-text-editor.tsx`, `src/lib/lesson-texts.ts:104`).
A URL alone does not import the manual. The existing scripture chapter reader is
separate from Come, Follow Me manual coverage. Verify which weeks/languages have
published text before changing primary navigation. Where text is unavailable,
offer a clearly labeled prepared excerpt/teacher summary and question with the
official source link; retain existing publication requirements.

## Recommended order

1. **Read here, respond here.** Reuse the existing lesson reader as “이번 주 읽고
   나누기” when content is available. Provide visible paragraph actions as well as
   text selection. On phones, open the selected quote and one response field in an
   immediately reachable composer; on larger screens, use an adjacent panel.
   Preserve scroll position, drafts, optional naming, and source access. The reader
   currently passes through the nickname gate; consider a read-first experience.
2. **Make question links complete destinations.** Question and brief context,
   one answer field, then optional other responses. Collapse long reading/posters.
   Suppress routine unrelated popups there. Connect passage/lesson questions to the
   existing `/p/[slug]` flow, and finish publishing with open/copy/share actions.
3. **Quiet the home and menus.** Prioritize the current reading/question and one
   upcoming event. Move archives, rewards, advanced study, and role-specific
   tools into their contexts. Preserve large text, languages, contrast and touch
   support. Home currently has roughly eleven major content groups, some conditional
   (`src/components/learning/home.tsx:40-218`).
4. **Unify sharing and recovery.** One understandable “생각 나누기” entrance,
   context prefilled, explicit public/private audience. Extend “내 글” to cover
   prompt replies and verse/text notes without weakening record access rules.
   Consider consistent edit-after-posting and confirmation.
5. **Later refinements.** Route known scripture links into the existing internal
   chapter reader; restore calendar preferences; expose classroom presentation and
   image cards after participation. These should not delay the central reading loop.

## Important qualifications and smaller gaps

- Public question links already bypass nickname setup (`shell.tsx:209`), but the
  global Daily Insight popup can appear when unseen content exists. Announcement
  popups can appear for returning nicknamed users with unread notices. Neither
  excludes `/p/`; this is conditional, not every visitor's experience
  (`daily-insight.tsx:405`, `announcement-popup.tsx:23,54`).
- Both apps can place large posters/full reading above the response box. Transfer
  the sibling's contextual workflow, not all its page density.
- Question creation currently closes the editor and reloads the list; it does not
  finish with a dedicated share-link success screen (`prompt-editor.tsx:78`,
  `think-page.tsx:131`). The prompt route inherits generic page metadata.
- `/think` defaults to all weeks. The public question page renders all loaded
  replies. A current-question default and progressive disclosure would reduce load.
- The visible sharing tabs are 함께 생각하기, 생각벽, 토론. Their nickname gates
  differ (`src/components/community/share-tabs.tsx`, `shell.tsx:209`).
- “내 글” currently combines sticky notes, discussion posts and teacher questions;
  it omits prompt replies and verse/text notes (`src/lib/service.ts:59`).
- Reading completion currently requires two reflection fields
  (`src/components/learning/learn.tsx:635`). A light reading/one-thought path is a
  proposal, not a change to existing completion rules.
- Preserve private highlights/private reflections separately from public replies.
  A shared URL is not access control: published replies can also be found through
  public question lists and home activity.

## Next implementation checks

Before implementation, inspect available published lesson text and confirm the
chosen behavior for missing weeks. Then verify the actual flows at phone and desktop
widths: open this week's reading, add a passage-linked thought without losing place,
recover a draft, follow a scripture reference and return, open a shared question
as a new guest without unrelated overlays, and publish/copy a question link as a
teacher. Test identity/visibility boundaries for shared and private records.

The initial comparison involved source inspection only; no application test run
or live database audit is claimed. Documentation verification checks preservation,
diff scope, and referenced paths. No background job or tomorrow reminder was set.

## Detailed interactive mockup (2026-10-04)

The user requested a detailed mockup grounded in the real app, including all page
transitions and common-question authoring. Created the conversation mockup at
`C:/Users/roger/.codex/visualizations/2026/10/04/01a106ae-9965-7a63-8016-c15e6b945834/ward-detailed-app.html`.

- The page map includes all 31 actual `page.tsx` routes, including the
  `/teacher/dashboard` alias. Route/source coverage received a bounded read-only
  review. Editor and completion states are distinguished from actual page routes.
- Common questions: primary entry is **나눔 → 공통질문 → 공통질문 올리기**
  (`/think`'s existing editor). Proposed shortcuts in teacher preparation and the
  lesson reader use the same editor. Proposed completion screen provides the
  `/p/[slug]` link and a guest-entry demonstration. Actual author/admin edit rules
  are preserved in the mockup.
- Student questions (`/questions`), public prompt replies, free thought-wall
  posts and teacher-created discussions remain separate. Ward-event editing
  depends on organization-manager/admin access, not teacher status alone.
- The mockup covers passage-linked public notes, private daily reflections,
  all nine worksheet fields, missing-text fallback, teacher/admin tools, material
  registration/review and editable lesson slides leading into presentation.
- Browser checks covered route rendering, question preview/publish/guest reply,
  mobile passage notes, discussion authoring/participation, slide editing and
  presentation, missing lesson text and guest personal-record gating. Checked
  layout at 360px and 1024px viewport widths without horizontal overflow on the
  inspected screens. JavaScript syntax passed and inspected browser flows had no
  reported console errors.

This is a local simulation with clearly labeled sample content and no network
requests or real posting. It does not verify production content, database state,
physical devices or actual application runtime. Existing application code,
database and AGENTS instructions were not changed for this mockup request.

## Content-based daily Come, Follow Me plan research (2026-10-04)

The user clarified that the desired seven-day organization is based on Come,
Follow Me **lesson content, questions and activities**, not scripture chapters.
Keep the seven-day idea. Treat it as the app's suggested plan, not an official
daily assignment. Scripture passages support each topic and may repeat across
days. Selecting core passages does not constitute reading the entire weekly
scripture range or the entire official lesson.

Official Korean lessons inspected:
- September 28–October 4, Isaiah 40–49: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/40?lang=kor
- October 5–11, Isaiah 50–57: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/41?lang=kor
- October 12–18, Isaiah 58–66: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/42?lang=kor

The adult/home-and-church sections have four, four and five major topics.
Suggested topic allocation:
- Lesson 40: comfort/hope over two days; servant/witness; God's power;
  refinement; application/scripture comparison; review/sharing.
- Lesson 41: hope over two days; Christ's atonement over two days;
  return/mercy; covenant inclusion; review/sharing.
- Lesson 42: fasting over two days; Sabbath joy; the Redeemer;
  sharing light; the future/Millennium; review/sharing.

Attach whole conference talks, videos, hymns and helps to the relevant topic as
optional resources rather than splitting them into arbitrary daily fragments.
Distinguish full conference videos from short clips: lesson 42's fasting clip
is 6:38, while the full Eyring conference video is 17:19. Nelson's April 2020
article on preparing for the Second Coming is a Liahona article, not a conference
talk. Family/children activities and teacher guidance should be audience-specific
expansions rather than additional required content for every user.

Source inspection found reusable scripture text and verse-note features, but the
internal reader currently displays whole chapters and does not accept a focused
verse range. Existing curriculum reading allocation is chapter-based; Week and
Prompt records do not yet model a daily content/activity context. Teacher-pasted
lesson Markdown exists; automatic official-lesson or conference-text importing
does not. External Markdown links open a new tab, but explicit return-to-activity
and reader-position restoration are not implemented. Prioritize content mapping,
focused scripture reading, contextual questions, draft/return-state preservation
and direct question links before a full conference/article reader.

This research updates the design direction only. No application source,
database, content-import pipeline or prior mockup was changed. Official pages
and linked resource text/metadata were inspected; video playback and live
application behavior were not tested.

## Interactive mockup updated with researched content (2026-10-04)

Updated the existing `ward-detailed-app.html` in the task visualization directory
with all three researched weeks and 21 content-based daily items. Each item has
a topic, official-section relationship, app-authored learning activity/question,
selected scripture ranges/counts and optional official resource references.
Seven-day allocation and questions are proposals; official full text was not
imported. The scripture demonstration shows range/context and exact official
verse links rather than pretending to contain the scripture text.

Daily flows now demonstrate private/public thoughts separately, topic-specific
drafts, reference details and return-to-question continuity, scripture-range
opinions, teacher question prefill/edit/publication and direct guest replies.
The page map adds the daily-content and reference-return paths while keeping
the original 31-route inventory and paragraph-reader/missing-text examples.

Checks: JavaScript syntax, all 21 passage counts and 15 resource references;
browser rendering of all 21 daily screens at 360px without horizontal overflow;
representative screens at 1024px; draft continuity through a reference screen;
Isaiah/Luke range switching and range-linked opinion; teacher publication,
guest reply, edited-question propagation and guest personal-record gate;
existing paragraph-reader and missing-text entry paths. No console warnings or
errors were reported in inspected flows. No real posting, imports, application
source edits or database writes were performed.

## Permission demonstration and current-week reader (2026-10-05)

The user is completing the Church permissions form. The requested language scope
now includes Korean, English, Spanish, and Filipino/Tagalog (replacing the earlier
Korean/English-only preference). No permission request was submitted or uploaded
by the agent, and no license has been obtained. The proposed purpose includes
reducing the external-reading/return-to-question steps and helping teachers choose
the focus of the ward's approximately 30-minute lessons from voluntarily shared
questions. Low calendar use is the user's observation about their ward.

Verified the user-supplied current site in the browser:
https://gokbanjeong-gospel-class.vercel.app/ . Navigation to `/learn` showed the
guest nickname gate; no guest identity was created and no member records were
accessed. Do not use `gokbanjung.vercel.app` as the deployed example: the earlier
check returned Vercel DEPLOYMENT_NOT_FOUND.

Updated the existing detailed conversation mockup, preserving its 31-route map
and three-week/21-day content inventory. The initial screen now demonstrates
October 5–11 (Isaiah 50–57), day 3, with a short attributed official introduction
excerpt, locally authored study guidance, a nearby passage composer, a question
response field, and an example related event. Full manual text and actual images
are not reproduced; their proposed positions are explicitly permission-dependent.
The manual's four themes retain the prior topic-based seven-day allocation.

Official editions verified during this update:
- Korean: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/41?lang=kor
- English: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/41?lang=eng
- Spanish: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/41?lang=spa
- Tagalog: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/41?lang=tgl

The language controls change official-edition source links; the preview prose
remains Korean. The art placeholder references the manual's Gospel Art Book
56–60 link. Conference talks/videos remain optional source-linked resources.

Added a teacher preparation simulation: public passage thoughts and question
replies appear alongside clearly labeled sample questions, private reflections
are excluded, and the teacher chooses up to two themes for a 30-minute plan
(5-minute opening, 22 minutes of discussion, 3-minute closing). The selected plan
populates the existing mockup lesson builder. This is a proposal, not a production
implementation or an official mandated class schedule. A comparison screen shows
the current external-reading steps and the proposed in-app reading/response flow.

Checks performed: script syntax and existing content/reference checks; all seven
current-week reader screens at a 360px browser viewport without horizontal
overflow; representative reader at 1024px; visual inspection at both widths;
public passage save and visible confirmation; private save excluded from teacher
preparation; draft recovery after closing/reopening the composer; teacher focus
to builder; teacher question publication to a direct guest reply; next-day reader
continuity; Spanish/Tagalog source URLs; no browser console errors. No application
source edits, live content imports, database changes or production posting.

## Complete pasted lesson integrated (2026-10-05)

The user supplied the complete October 5–11 lesson text in English and Korean
after clarifying that summaries and full-text placeholders did not meet the
requested demonstration. Replaced the active weekly reader in the detailed
conversation mockup with those supplied texts, preserving all original wording.
The canonical text retains 65 nonempty Korean lines and 66 English lines,
including every activity, question, quotation, reference, teacher instruction,
children's section, media label/duration, and art caption. Only surrounding blank
lines/outer whitespace were normalized for presentation.

The seven-day entry points now show actual original text: introduction and hope
discovery; hope/action and resources; personal Atonement study; video/art/hymn
activities; return/mercy; covenant inclusion; Scripture Helps and review.
Relevant family/children activities and teacher instructions are available in
disclosures. The complete weekly reader presents every source block once, in
original order, with sections collapsed for progressive reading.

Paragraph actions open a nearby composer, retain the selected text or complete
paragraph, keep public/private drafts distinct, and can prefill a teacher's
public question with the actual original question and paragraph. Original
questions and subsequently edited/published teacher questions are labeled
distinctly. Scripture references link to the corresponding official source;
conference/video/hymn links open a reference-return screen. No linked talk/video
full text or full scripture chapters were imported into this preview.

Korean/English buttons switch the full supplied editions. Spanish and
Filipino/Tagalog still show a missing-text state and the verified official-edition
links. Do not claim four full editions have been loaded. Actual image/video files
were not in the pasted material; all supplied captions/credits are preserved.
Supplying text for this local demonstration is not evidence that permission to
republish it on the live website has been granted.

Verification: canonical source-line equality against both attachments; complete
ordered weekly-reader coverage; all source text reachable across seven days and
contextual disclosures; browser text equality for all 65/66 rendered blocks;
14 daily views (two languages) at 360px without horizontal overflow; representative
1024px views and visual inspection at both widths; full quotations; paragraph
public/private saves; private-note exclusion from teacher preparation; draft
recovery after a reference excursion; source-paragraph question creation and
direct guest reply; honest missing-edition states; script syntax and no browser
console errors. All posting/saving remained simulated. No production application
code, database, permission form submission, commit, or deployment changed.

## Next-week materials and iframe prototype (2026-10-18)

The user requested a study-time rebalance for **October 19–25**, not the earlier
October 5–11 lesson, then asked for images with whole external-talk links attached
to the materials and an iframe popup reader where supported. Official next-week
source: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/43?lang=eng .

Prepared `docs/working/materials/2026-10-19/`: five original downloaded lesson JPEGs,
the printable gathering-activity PDF, `materials.json` with source URLs/hashes,
five verified whole-talk links, README, and a representative iframe check report.
Images are the Jeremiah artwork, cistern/waterfall comparison, girl with baby,
potter's hands, and children's gathering activity. No article/talk full text was
downloaded or copied into this bundle. Logos, interface icons and analytics
resources were excluded. These files are prepared local attachments; no live
Supabase material records or public uploads were created.

Updated the existing detailed mockup with a new default 43rd-week view, daily
image/talk attachments, weekly timing list, attachment catalog, question drafts,
and source-popup layout/fallback. Preserved all older routes and both complete
user-supplied October 5–11 texts. Explicit dates distinguish that older example
from next week's source-linked material. The next-week lesson's full wording is
provided by the official website, not imported into the conversation fragment.

The proposed full-reference path budgets approximately 35.9, 35.5, 36.9, 34.5,
36.4, 41.1 and 40.7 minutes. It includes all eight specified chapters (204 verses),
additional/repeated cross references, the four conference talks as full videos,
the whole Hope of Israel text, and planned activity/sharing time. Assumptions:
English reading at 160 words/minute, scripture at 6 verses/minute; activity times
are proposed budgets, not participant measurements. The Hope of Israel page has
both Russell M. and Wendy W. Nelson, approximately 5,398 paragraph words, and a
61:35 full broadcast. Default time uses reading that complete text; choosing the
whole broadcast explicitly changes day seven to approximately 69 minutes. The
plan does not pretend that all-video study is evenly balanced. General magazines
and other library links remain accessible in the source; the teacher object-
lesson demonstration video is an additional option outside the main time budget.

Live iframe proof: a representative official talk returned HTTP 200 with no
X-Frame-Options or frame-ancestors restriction. In the browser, the complete
official week-43 manual and complete Corbitt talk rendered in a native dialog
iframe. Returning kept the question and draft. Cached frames preserve their
in-session reading position when reopening the same source. No cross-origin
selection capture was implemented; do not promise automatic quote anchoring.
Keep an ordinary official-page link as fallback. Framing was not tested on all
sources or physical devices, and headers may change.

The conversation renderer has `frame-src 'none'`; it cannot run this live iframe.
The separate test/prototype is `next-week-live-preview.html` in the visualization
directory, served locally on port 8881 when running. It loads official pages
directly with a narrow frame-src allowlist and does not proxy/copy their text.
No production CSP was changed. `iframe-reader-check.html` is the smaller initial
test. Static `live-iframe-proof.jpg` records the real embedded talk and composer.

Checks: source image hashes/PDF signature, five whole talk assignments, seven-day
coverage and 204-verse plan, computed timing spread under eight minutes in the
default reading path, explicit longer-broadcast alternative, script syntax,
all seven conversation screens in the 360px phone layout without horizontal
overflow, all five inline image loads, draft recovery through source layout,
and real browser iframe/draft tests. No conversation-preview console errors were
reported. Production application code/database/GitHub were unchanged.

## Direct daily original-source reader (2026-10-18)

The user rejected the popup-first experience and approved: select a day, see the
official original immediately, guide the assigned range, and keep sharing close.
They also noted that a live original iframe removes the need to download assets.
Updated the standalone `next-week-live-preview.html` at the same localhost:8881
address. Its editable source is now `daily-source-reader.template.html`, built by
`build-daily-source-reader.py` in this chat's visualization directory. Do not run
the older `finish-next-week-materials.py` over it; that produces the prior design.

The new reader embeds no local images, image data URLs, manual body, or talk body.
Images, video, and original wording load within the official source frame. Prior
downloaded material bundles and older detailed conversation mockups are retained,
but are not dependencies of this reader. No production code or GitHub changed.

Seven day buttons open assigned original locations directly, without an opening
popup/button. Range guidance is above the frame; detailed scriptures, activities,
whole-talk links and planning estimates are disclosed on demand. Day four starts
at the original cistern image. Day three and seven use preceding context anchors
so the official sticky toolbar does not cover the first assigned paragraph.
All four official editions were opened; generated Scripture Helps anchors differ:
kor p_pLmhI, eng p_qvIof, spa p_xmfaa, tgl p_t7eEo. These are mapped explicitly.

Thought composer is a side panel on desktop and a sheet on narrow screens.
Drafts, visibility, optional names, mock entries and read-completion marks remain
in sessionStorage for this browser tab only. It distinguishes private records
from simulated class sharing, without a real publication/backend. Cached source
frames retain reading positions when returning from a reference. Cross-origin
selection capture, section hiding and automatic stopping at an endpoint are not
implemented; the whole original remains scrollable. Keep the official new-tab
fallback. Source images may be above/below the assigned section in the original.

Verified: syntax/build assertions (no embedded images/network APIs), seven direct
day URLs, representative Korean section/paragraph positions, four official
language editions, Corbitt talk and return, draft retention across day navigation,
private and anonymous-class mock saves. Actual browser viewport 360x800 had no
horizontal overflow with both reader and composer; default desktop 1280x720 also
fits without outer scrolling. Browser emulation only, no physical-device test.

## Complete question-led daily plan and Church sign-in check (2026-10-18)

User authorized rebalancing the mockup again: one complete core question/range per
day, retain all contents, and show linked-message/family workloads separately.
They clarified that sign-in means the Church Account inside the official iframe,
and raised the resulting loss of account-synced private annotations.

The standalone live reader now uses `daily-study-plan.json`, generated by
`rebalance-daily-plan.py`; `daily-reader-v3.js` and the existing template are
assembled by `build-daily-source-reader.py`. All are in this chat's visualization
directory. The same localhost:8881/next-week-live-preview.html remains the result.
Earlier detailed conversation mockups, downloaded materials, and original supplied
October 5 texts are preserved; they do not implement this newest distribution.

| Day | Complete core focus | Core incl. scriptures/questions | Linked messages | Family |
| --- | --- | --- | --- | --- |
| 1 | Introduction + whole prophetic-calling section | ~18 min | ~15 min | ~8 min |
| 2 | Premortal identity discovery, through Corbitt application | ~10 min | ~23 min | ~10 min |
| 3 | Whole Nelson quotation + remembering/applying identity + references | ~12 min | ~14 min | None new |
| 4 | Cistern image + whole living-water paragraph + object-lesson guidance | ~14 min | None new | ~10 min |
| 5 | Whole worship/actions paragraph + all Scripture Helps links | ~13 min | ~9 min | None new |
| 6 | Whole gathering section, including application and magazine links | ~16 min | ~12 min | ~14 min |
| 7 | Whole potter section, photograph/caption and Friend link | ~12 min | ~12 min | ~16 min |

The 2006 Gathering talk is assigned whole to day 1 (the introduction's gathering
mission and prophetic role); its original day-6 child-section link remains.
Corbitt is whole on day 2; Decisions for Eternity whole on day 3; Maynes whole on
day 7. Hope of Israel is fully assigned by natural boundaries: opening + Wendy
Nelson's whole address on day 2 (p2-p56 plus header/credits); Russell Nelson's
gathering explanation/invitation on day 6 (p57-p89); all five invitations, closing
and all notes on day 5 (p90-p120 + notes), connected to worship through actions.
Whole-message buttons and the complete 61:35 broadcast remain available.
Watching that complete broadcast replaces, rather than adds to, its reading path.

Audit: all 25 principal numbered lesson paragraphs have one assigned home across
core/family sections; original illustrations/captions, teaching tip/video, hymn,
children's song, all four child themes, worksheet/PDF, three Scripture Helps and
More, topic/guide links and magazine/library links are retained in the official
source and assigned in metadata. All 8 weekly chapters / 204 primary verses are
assigned once; repeated/cross references are additional. Jeremiah 17's placement
with identity/choices is explicitly our planning suggestion. No body was copied.
Hope of Israel's 5,398-word DOM count includes 23 header/credit words and 109 note
words; these are accounted for in the segment metadata. Note the non-contiguous
object-lesson guidance belongs thematically to day 4, not a false contiguous range.

Time assumptions are exposed: English 160 words/minute, 6 scripture verses/minute,
proposed (not observed) activity budgets; four whole conference messages use
English video duration, Hope uses whole-text reading by assigned segments. Family
and linked materials are separate. Listed combined paths range ~22-43 minutes;
they are not claimed identical. Extra library/document exploration and the
object-lesson video duration are unmeasured and explicitly excluded from totals.

Church sign-in: clicking Sign In inside the original reader produced blocked
content. A separate local read-only fixture `auth-frame-check.html` explicitly
allowed both www.churchofjesuschrist.org and id.churchofjesuschrist.org as frame
sources; clicking the official sign-in there still produced
`id.churchofjesuschrist.org refused to connect`. The same official sign-in in a
top-level source tab navigated to the id domain's OAuth authorize endpoint.
No account identifiers, passwords, cookies, tokens or actual annotations were
entered/read/exported. This is observed failure in this browser, not verification
of every Church response header or a universal policy statement. No framing
headers were removed/proxied or security restrictions bypassed. The app's CSP
remains limited to the official content host; only the isolated test fixture
allows the identity host. Already-signed-in session reuse was initially untested;
the authenticated comparison below supersedes that uncertainty for this browser.
Do not promise it works after top-level sign-in in other environments.

The mockup explains this and provides an ordinary original/new-tab annotation
link. Gospel Library Online supports account annotations at the official source:
https://www.churchofjesuschrist.org/tools/help/using-the-study-tools?lang=eng ;
https://www.churchofjesuschrist.org/learn/mobile-applications/gospellibrary?lang=eng .
Our own account/private reflections are separate (see learn.tsx reflection panel,
service.ts reflection owner_id writes). Existing text/verse note flows are public
comments, so do not relabel them as private notes. No sync bridge to Church
Account annotations has been implemented. Cross-origin selection capture remains
unavailable in this reader. The prototype stores only tab-local simulated notes.

New plan storage uses v3. Earlier v2 drafts/entries are left untouched and exposed
in a local preservation drawer, rather than incorrectly associating old day 5
potter/day 7 gathering notes with the new topics. Users can explicitly continue
an older draft in the current day. No real account login or backend was added.

Checks: coverage/word-count/204-verse assertions; generated-script syntax; required
DOM IDs; no embedded assets or API calls; all 7 question/range/time states; real
Korean Hope p2/p13, p57, p90 target existence and contextual positions; reference
return and auto-closing material disclosure; 360x800 all 7 day views without
horizontal overflow (262px+ source viewport); draft recovery across navigation
and refresh; private mock save explicitly says no Church Account storage.
Production application code, database, GitHub and deployment remain unchanged.

## Authenticated official-window versus iframe comparison (2026-10-18)

At the user's explicit request, opened the official week-43 source in the same
in-app browser as the localhost reader. The user personally completed Church
Account sign-in and reported completion. No credentials, account identifiers,
tokens, cookie values or existing private notes were inspected or exported.

Observed baseline: the official top-level source returned to the manual and its
annotation toolbar contained Mark, Note, Tag, Add, Link, Copy and Share. Selecting
the public phrase `실제 행위는` in paragraph p16 activated its Note/Tag/Mark actions.

The existing localhost iframe was reloaded both by its start-position action and
by reloading the whole parent page. Its toolbar still contained only Close,
Mark, Copy and Share; there was no Note button. Repeated comparison with the
separate auth-frame-check.html fixture (which permits both the official content
and identity hosts), including its sign-in action and a subsequent whole-page
reload, likewise exposed no Note action. This rules out the main reader's narrow
frame-src list as a sufficient explanation for the observed missing notes UI.
It does not establish an exact cookie/identity-service cause or a universal rule
for Chrome, Edge, Safari, mobile browsers or pre-existing sessions elsewhere.

Result in this in-app browser: top-level Church sign-in did not make personal
annotation tools available inside the tested third-party iframe. No personal
test annotation was created, because the iframe had no Note composer to submit.
Do not report a server-side save rejection or successful sync: neither occurred.
One unrelated study-set button attempt timed out; conclusions use the toolbar
comparison and successful fresh-frame tests, not that failed click.

Screenshots `signed-official-annotation-tools.jpg` and
`signed-iframe-annotation-tools.jpg` in the task visualization directory record
the comparison. They contain no entered credentials. Keep the user-authenticated
official source tab available; never sign the user out as test cleanup. Restore
the reader's original selected day 5 after inspection. The mockup account note
now describes this observed signed-in failure rather than an untested scenario.
No production application, account configuration, GitHub or database changed.

## Approved seven-day plan and compact original reader (2026-10-18)

The user approved the proposed distribution and requested implementation in the
localhost mockup first, with minimal top guidance and visible start/end bounds.
The current `next-week-live-preview.html` now builds from
`compact-source-reader.template.html` and `compact-source-reader.js` in the task
visualization directory; `prepare-compact-reader.py` reuses the previous local
draft/preservation behavior. Earlier templates and application work remain intact.

Plan metadata version 4 in `rebalance-daily-plan.py`: day 1 intro/prophet calling;
day 2 identity discovery/Corbitt/whole Wendy section; day 3 Nelson identity quote
and application/Decisions; day 4 living water/object lesson; day 5 worship/whole
Jeremiah 7/five invitations through all Hope closing notes; day 6 whole gathering
section/Gathering 2006/Russell gathering explanation and invitation; day 7 potter/
Maynes. Gathering 2006 belongs on day 6, not day 1. Basic scripture links follow
the manual's selected verses; the complete eight-chapter, 204-verse route remains
separate optional extension reading. Jeremiah 2 and 7 already occur as whole
chapters in basic study and are labeled to avoid duplicate reading/time counting.

The top now contains a native day selector, original/annotation link and Materials
button, followed by two short start/end lines. Times, complete core question,
scriptures, linked talks, family activities and the whole-week plan moved into a
native dialog. The bottom retains the immediate thought composer and next day.
Opening a resource closes the dialog; its assigned bounds replace the top bounds,
and a return-to-today button restores the cached manual. Language changes retain
the active resource. Existing v3 drafts/entries and v2 preservation drawer remain.
No Church content body or images were copied into this reader; all originals,
media and references remain available through official sources. The source still
scrolls beyond a daily end; this is guidance, not section isolation. Intro links
use the preceding title as hash context so the first paragraph is not hidden by
the official sticky toolbar. Official internal controls cannot be restyled here.

Checks: all 25 principal paragraphs assigned once, all five talks retained,
all 5,398 Hope words assigned, 204 extension verses retained; generated JS syntax,
required IDs and no local source-body/assets/API calls. Browser emulation at
884x884 measured 720px iframe height versus the previous 447px (about 61% gain),
with own top chrome reduced from 298px to 107px. At 360x800 all seven day states
had 639px reader height, one visible frame and no horizontal overflow. Verified
talk open/automatic dialog close, active-resource language switch, manual return,
draft retention across day changes and reload, and explicitly local-only private
save feedback in a disposable test tab (closed afterward). Viewport override was
reset. Final screenshot: `compact-reader-final.png`. The reader is left on day 1;
the user-authenticated official tab remains open and signed in. No production
source, database, GitHub commit/push or deployment changed.

## Source-row gap audit and automatic day entry (2026-10-18)

The user challenged the blanket coverage claim, pointed to a day-1/day-2 gap,
required no omissions, requested automatic section entry on day changes, and
asked for numbered lines and daily counts. Earlier coverage assertions described
the assigned 25 principal paragraphs, not a complete source/media/link inventory.
Do not reuse that narrow assertion as evidence of universal completeness.

Reproduced a real navigation defect: `id=sec3#sec3` opened the manual top instead
of day 2. The reader now maps section containers to supported paragraph IDs plus
the preceding scripture-heading context (day 2 `id=p7#scripture_title2`, day 6
`p17#scripture_title4`, day 7 `p25#scripture_title8`); cached day frames reset on
day changes. Confirmed day-2 first paragraph at 53px and day-7 p25 at 76px. Source
toolbars can obscure headings/first lines at some anchors; this does not isolate
or rewrite the cross-origin document. A separate top-level text-fragment trial
centered p16 but was not integrated into the iframe or reported as iframe proof.

Found two previously under-inventoried source branches: the complete Scripture
Helps page (11 explanations plus Learn More/media) and the image-only children's
additional-resource banner. Both now have explicit topic/day entry buttons.
Removed the unsupported claim that the Korean object-lesson tip directly linked
to a separate teaching video. The full source text remains official and unchanged.

`source_row_coverage.py` records public source DOM IDs and character counts, not
copied bodies. Row definition: Korean #main innerText split on newline, trimmed,
blank lines excluded. A long paragraph is one row; these are NOT responsive
display lines, verses, English counts or estimates of study time. M001–061 is
the weekly manual; H001–073 is its direct Scripture Helps; K001–026 is the direct
children's additional-resource list. Ambiguous repeated headings were resolved
to their actual separate IDs. All 160 rows have one assigned day, no duplicate or
unassigned row; fresh browser reads confirmed all three counts and every mapped
source ID exists. This does NOT count the full bodies of linked scripture
chapters, talks, articles, magazines or recursively linked libraries. Their
original links remain; do not call these 160 rows an audit of every linked body.

Daily M/H/K/total counts: 1=18/24/5/47; 2=10/4/10/24; 3=5/4/0/9;
4=5/4/0/9; 5=6/20/0/26; 6=12/11/5/28; 7=5/6/6/17.
Main ranges are gapless in their union: day1 M001–014 +047–050; day2 M015–019
+042–046; day3 M020–024; day4 M025–028 +030; day5 M029 +037–041;
day6 M031–036 +051–055 +061; day7 M056–060. Day 1 now explicitly ends after
the prophet video, with its intro, study questions, hymn and Articles of Faith
shown as separate ordered entries. Day 2 begins M015. Cover/title are retained
at day-1 entry, rather than silently starting at M004. The reordered family and
supporting sections are deliberately non-contiguous in the original document.

Materials now shows daily counts/ranges, all 160 numbered source links, and a
separate 17-item image/media/PDF inventory (including icons/thumbnails). It does
not inject numbers into the official iframe. CSV: `source-row-coverage.csv` in
the visualization directory; screenshot: `numbered-source-row-audit.png`.
All generator assertions, generated JS syntax, required IDs, CSV row count and
rendered seven-row totals passed. All seven day source URLs and no-overflow
states were inspected at desktop width. A later viewport attempt still reported
884px, so do not claim that attempt verified the new table at phone width.
New supplementary exploration time is explicitly unestimated and excluded from
the old totals; complete workload equality is not established by row coverage.
Temporary research tab was closed; authenticated official tab retained. No
application source, database, GitHub commit/push or deployment changed.

### Full-text workload and two-track reader (2026-10-18, supersedes v5 timing)

Latest local preview remains `http://127.0.0.1:8881/next-week-live-preview.html`.
Artifacts are in the same task visualization directory recorded above. Canonical
build sequence is now `build-time-balanced-plan.py`, then `build-balanced-reader.py`;
the older compact-reader build produces the historical v5, not this revision.
Preserved pre-change plan/page as `before-time-balance-*` snapshots.

Read public official DOM text nodes (including hidden source footnotes), keeping
counts/IDs/links only in `audited-workload-sources.json`, not copied source bodies.
Audited 25 bounded sources: complete weekly manual, Scripture Helps and children's
resource catalog; 8 complete Jeremiah chapters (204 verses), 13 additional verses
specified by the manual, and 9 complete messages/articles including Helps citations.
Messages: Corbitt 2021; Decisions for Eternity 2013; both speakers of Hope of Israel
2018; Gathering 2006; Maynes 2015; Bangerter 2024; Everlasting Covenant 2022;
Holland 1998; Packer 1972. The latter two use inspected English texts; tested Holland
Korean path returned 404, but do not claim Packer Korean unavailable (not checked).
All other counts use Korean. Total basis: 72,738 nonspace Korean chars + 4,628
English words. English inline text was joined before word counting.

`balanced-study-plan.json` and `full-source-workload-audit.csv` assign all 1,117
paragraph/heading/caption/note units exactly once (0 missing/duplicate/extra).
217 assigned verses and 9 messages/articles include their entire audited bodies.
Do NOT extend that claim to every recursively linked scripture chapter, magazine,
song, story, topic guide, or library. Other source options remain official links.
The previous 160 M/H/K rows are a different visible-line measure; their day mapping
is remapped in metadata, but current UI displays the expanded 1,117-unit audit.
Current daily unit counts: 178 / 151 / 146 / 160 / 183 / 160 / 139.

Reading estimates assume 300 Korean nonspace chars/min or 160 English words/min;
activities have explicit proposed budgets. Not participant-timed. Official short
video durations (not full playback measurements) are 1:38 day 1, 1:30 day 5, and
3:32 family day 6, counted once. Whole-talk videos are alternatives, not additive.
Basic daily minutes: 46.0 / 46.3 / 45.5 / 45.5 / 45.5 / 44.9 / 44.4.
Optional family additional minutes: 4.5 / 6.5 / 5.4 / 10.0 / 4.4 / 15.4 / 16.3.
Combined: 50.5 / 52.8 / 50.8 / 55.5 / 49.9 / 60.2 / 60.7. UI explicitly says
basic track is balanced; combined family path is longer on hands-on activity days.

`balanced-source-reader.js` renders two 44px shortcuts directly below the dropdown,
auto opens each assigned track's first source, and sequences every assigned reading,
short video and activity before next-day progression. End boundaries remain guidance;
cross-origin source still scrolls freely. Shared family day 4/7 source explanations
are assigned once in the basic inventory; family activity time is additional.
Notes in Helps have arbitrary IDs, so visible endpoints are separated from attached
notes. Jeremiah 7 later headings stay with later verses. Footnote links open their
verified citing paragraph/verse; readers then click the official note number.
Verified actual Jeremiah 1 note opened in iframe. No private annotation was created.
Source anchor context avoids fixed-toolbar clipping; some routes include preceding
context. No parent access/cropping of the official document or asset downloads.

Drafts/entries use new session key `gok-next-week-reader-v6`, split by day+track.
Existing v3 basic drafts/entries are seeded without overwriting v3; v2 archive kept.
Disposable tab test verified basic draft survived family draft and reload. No real
posting, backend calls, Church Account sync, or credential access. Authenticated
official tab 15 retained, main preview tab 7 retained; temporary tabs closed.

Checks: generator coverage/assertions, CSV 1,117 rows, nonempty source names, note
owner mappings, required element IDs, JS syntax, Git diff whitespace. Browser checked
all 7x2 initial routes, English fallback, source task navigation, actual scripture
footnote opening, and draft separation/recovery. Actual 390x844 viewport: no horizontal
overflow, both shortcuts 44px, reading area 608px (~72%). Desktop 884x884 also checked;
viewport override reset. Physical devices and alternate-language anchor parity untested.
Proofs: `balanced-reader-desktop.png`, `balanced-reader-phone.png`, and
`balanced-reader-week-table.png`. No app source/DB/production/GitHub changes made.

### Latest user correction: visible source boundaries take priority

The user explicitly said time is unnecessary and objected that the blue line
selected only the painting credit, making the assigned reading range unknowable.
Removed all visible estimated-time labels and tables from the reader/materials;
timing metadata remains historical calculation evidence, not the current UX.

Fixed the underlying URL selection: `id=` now lists every assigned visible source
heading/paragraph/caption, rather than just the first anchor. Official Church
rendering supports comma-separated IDs and marks them with `active-item` blue
vertical lines. This is native source behavior, not injected iframe styles.
Hidden notes remain separate citation links. Non-text video/image containers do
not receive native paragraph blue lines, so short video steps now immediately
follow their parent reading item. The displayed reading endpoint is its last
selectable text unit (day 1: p6 before the prophet video), not the video box.

Added explicit Start View / End View buttons; both keep the entire current
selection, while moving the source hash to its first or last paragraph. End view
does not replace the full range with a single selected paragraph. Preceding context
keeps the last paragraph visible below the official fixed toolbar.

Browser verified day-1 native selection covers cover credit, weekly title, topic
headings, p1–p6; p7 is unselected (next day's start). Verified remaining primary
first-source selections: day2 p7–p9 + heading; day3 p10–p14; day4 figure2 caption,
heading, p15; day5 p16; day6 heading, p17–p19, figure4 caption; day7 heading, p25,
figure5 and potter captions. Family day7 selects its heading and p25. Existing
1,117-unit allocation data is unchanged. Current source is still freely scrollable.

Final mobile verification was actually 390x844: no horizontal overflow, 572px
reading area, end paragraph and blue-line termination visible. An earlier attempt
still measured 884px because a temporary research tab held the viewport; retried
after closing it, captured the real mobile result, and reset the override.
Proofs now: `blue-range-start.png`, `blue-range-end.png`,
`blue-range-end-phone.png`. Older balanced-reader screenshots contain obsolete
time UI. Main preview tab7 and authenticated official tab15 retained; research21
closed. JS syntax and required-ID build assertions passed. No app/GitHub changes.

### Compact range-chip mockup (latest)

Replaced the two full-width learning-track bars and standalone boundary rows with
two natural-width pill chips showing the daily basic/family topic. On desktop
the chips, progress, Start View and End View share one 49px toolbar. Mobile wraps
the controls below the chips. Hidden boundary descriptions remain associated with
the Start/End buttons for accessibility; chip tooltips give first-source boundaries.
Existing blue source selection, task queues and per-track drafts remain.
Browser checked family-chip navigation, desktop layout, and actual 390x844 mobile
layout: no horizontal overflow, 644px original-source reading region. Viewport
reset. JS syntax/build checks pass. Proofs: `range-chips-desktop.png` and
`range-chips-phone.png`. Main preview retained on day7 basic, original signed tab
retained. This is a local mockup update only.

### Teacher questions/posts review for top-header entry (2026-10-18)

User wants the vacant top-header area to expose teacher-posted common questions,
posters, participant responses/comments and a collection of shared thoughts.
Read-only source review confirms sibling `src/prompts.js` and
`src/prompt-discussions.js` implement collection `/questions`, share `/p/<slug>`,
teacher/admin creation, reading text/source link, one PNG/JPG/WebP poster up to
5MB, optional-name anonymous participant responses, reply threads, reactions,
and draft recovery. These two staging files hash-match the canonical checkout at
`C:/Users/roger/OneDrive/Desktop/Workspace/comefollowme`. No member data read.

Gokbanjung already has corresponding real components in `src/components/think/`,
`src/lib/prompts.ts`, `/think` and `/p/[slug]`. PromptEditor has question, optional
reading/source/reference/week and one image poster. ThinkPage lists questions
with week filtering; PromptView loads all responses to the selected question;
ReplyItem provides comments/reactions. Arbitrary PDF/file attachments and a flat
cross-question all-comments feed are not present in these reviewed components.
Current association is week, with no reviewed day/date assignment field. A real
teacher-selected daily question needs an explicit assignment rule/model.

Proposed top entry: Today’s Question -> teacher question/optional collapsed poster
and reading -> immediate response field + shared responses -> All Questions.
This must be teacher-authored shared content, distinct from the prototype's own
daily study questions/private drafts. Existing local preview composer remains
session-only and is NOT connected to actual shared prompt data. This turn only
verified code and proposed the flow; no reader/app/DB/production changes.

### Question panel, shared thoughts and optional progress mockup (2026-10-18)

Implemented in the standalone visualization reader, not the Next app or deployment.
Build: `build-balanced-reader.py`; additions: `community-panel.html`,
`community-demo.js`, original `question-poster-demo.svg`, `study-progress.html`,
`study-progress.js`. All live in the existing visualization directory.

Header Today Question opens teacher question, collapsed poster and immediate
composer. Range bubble counts public thoughts associated with current assigned
source range (parent overlay, not a paragraph injected into cross-origin iframe).
Collection has all questions and flat public thoughts with day/search filters.
Teacher-view simulation allows question/day/text/poster creation or edits; IDs
and links remain stable on edits. Deep links use `?question=q6`; actual app already
has `/p/[slug]` but new mockup data is tab-local only. Uploaded poster previews
are blob URLs and require reselecting after reload. Sample poster is our own SVG.
No third-party assets downloaded, no network writes or actual member data.

Progress is explicit self-report per material; basic/family tracks independent.
Question participation is optional and excluded from learning completion. New
completion offers a dismissible inline question invitation, with dismissal saved.
Sample answers never count as personal participation. Existing private learning
composer and drafts retained behind Previous Learning Notes; private range posts
excluded from public counts/collection. Shared demo uses separate session key.

Verified in disposable browser tab: partial checkbox/bulk completion, 100% day
mark and 16% week (11/67), independent question participation (1/7), gentle prompt
dismissal surviving reload, real local answer, teacher edit retaining q1 link,
q6 direct-link entry, same-question draft recovery after reload, private post
excluded by collection search. Fresh deliverable uses untouched sample data.
Responsive emulation: 390x844, no horizontal overflow, 390px question panel,
16px composer, bottom844; 1280px no overflow, 870px reading area beside panel.
Narrow screens <=900px use full-screen question panel. Viewport override reset.
Build required-ID assertions and JS syntax pass. Proofs: today-question-desktop.png,
today-question-mobile.png, shared-thoughts-collection.png. No physical-device test.

Production side question: read-only browser test of
`https://gokbanjeong-gospel-class.vercel.app/week/43/day/1` loads app shell and then
Unable to connect. Route is present, not 404. Code calls POST /api/session then
GET /api/bootstrap; root cause is not established from UI (no server logs read).
Local curriculum maps week43 to 2026-10-19 through25; routes support
/week/43 and /week/43/day/1..7. Deep links currently still hit connection failure.
No production fixes, commits, pushes, DB changes or deployments performed.

### Approved mockup integration branch (2026-10-18)

Branch: `codex/integrated-study-reader`, created from main, local changes only.
Original AGENTS and docs/working changes were already present; preserved. No
commit/push/production migration/deployment. Local Git author name/email are unset;
do not guess or copy another developer's identity for a later commit.

Implemented actual Next app reader at `/week/43/day/1..7` with compact header,
range chips, original Church iframe blue selections, start/end jumps, materials
and notes links, optional private device notes, day completion and questions panel.
Old LessonPage is retained behind `?view=notes` and GuestGate. Home is public so
an unavailable session DB does not prevent navigating to official-source reading.
Reader and direct /p/ links suppress unrelated announcement/insight popups.
Other weeks keep existing reader; approved daily plan only exists for week43.

Imported metadata only from approved v6 plan; 25 documents/1,117 unique units,
67 basic tasks. Tests compare exact source path/anchor/day/track/task ownership
against the pre-existing CSV inventory, not only counts. No original source body
or third-party media files copied. Dynamic translated IDs use the audited source
language (with visible notice), not mismatched Korean IDs in translated pages.
Four-language URL generation is tested; not all translated source borders have
been physically/browser checked. See docs/study/cfm-distribution-method.md and
its linked full CSV inventory. README and AGENTS link this required workflow.

Community: additive daily prompt metadata and range-thought tables; existing
PromptEditor day selection, poster UI and canonical /p/slug links reused. Range
private notes are owner-only; public collection combines replies and range thoughts.
Mobile panel traps focus/inerts reader; context and replies scroll above fixed
composer. Question participation never gates self-reported learning completion.
Separate material and day-completion tables avoid old reflection/reward triggers;
journey combines completion markers without rewriting old reflections/progress.
Server serializes progress per actor; reader remounts on identity/day changes and
rejects stale async results. No public sample content seeded into app source.

Migration files 20261018010000_study_community.sql and
20261018020000_study_material_progress.sql are unapplied to production. Generated
DB업데이트_SQL편집기용.sql includes them and idempotent SQL-editor test passes. Apply
migrations before deploying this code; new feature API requires the new tables.
Local review DB `.local-db/study-review-20261018` contains clearly labelled local
fixtures only. Server3000 session38289 explicitly clears production DB/Auth/AI
vars. Old mockup8881 remains separate; actual app tab27 retained.

Checks: tsc passed; production build with --webpack passed (Turbopack sandbox build
stalled, stopped own PID and used supported webpack build). Full90 tests:89 pass,
1 fail unchanged AI integration: on Sunday2026-10-18 quizScope daily uses the old
look-back reading label, resulting in no chapters and source_unavailable. This
was not changed here. Full lint:21 errors/59 warnings from existing components;
new reader/services/tests and modified prompt code targeted lint0errors,5warnings
(existing remote img tags and service unused imports). No new lint suppressions.
Diff whitespace review clean. Runtime bundled Node24.19, project targetsNode22;
Node22 physical/CI verification remains separate.

Browser actual app (not static mockup): guest posts anonymous reply; question
participation1/7 with learning0%; day2 checks9/9 ->100% without answering; optional
invite dismissed and absent after reload; close/reopen restores same question draft;
public /p/slug opens directly with enabled reply after guest bootstrap, no signup.
Mobile390x844: no overflow, panel390wide, 16px textarea, composer bottom844; reader
633px before panel. Desktop1280 checked. Family day7 retains track through URL
navigation and native selected IDs scripture_title8,title11,p25; End keeps same
selection. Official iframe emitted its own React hydration/observer console errors,
but source rendered. No claims of fixing Church iframe JS or Church annotation auth.
Proofs in visualization dir: integrated-reader-desktop.png / integrated-reader-mobile.png.

### Remote push preparation (2026-10-19)

User explicitly requested pushing this implementation to its remote branch.
Verified origin is https://github.com/kimhk35/gokbanjung.git and local branch is
codex/integrated-study-reader; no remote branch with that name was found.
Host and sandbox Git author name/email are both unset. Asked the user for the
commit identity rather than guessing or copying historical author information.
Prepared the30 relevant source/documentation/migration/test files. Earlier local
materials (unused images/PDFs under docs/working/materials/) remain unstaged.
Staged whitespace check passed; credential-pattern scan reported no matches and
no env/local database files are staged. Production DB remains unchanged.

Re-ran all tests with the client date now2026-10-19:90/90 pass, including the
previous date-dependent AI quiz integration test. Production webpack build and
new-code lint results above are reused for unchanged code. Existing full-project
lint errors remain. Commit and push await the user's author name/email.

### Commit identity supplied (2026-10-19)

User supplied rogernhpark@gmail.com for the requested commit/push. Configured
repository-local author rogernhpark with that email; no global Git settings changed.
The30 reviewed files are committed on codex/integrated-study-reader. Full90 tests
pass. Unused docs/working/materials assets remain local and untracked. Pushing only
this feature branch to origin; production DB migrations remain unapplied.

## Neon authentication and file storage — 2026-10-20

The former Supabase project was deleted. Production was moved to Neon and the
original migrations plus seed were installed. Guest reads returned 200 and the
course has 52 weeks. Old Supabase passwords and file bytes cannot be recovered
from the new database.

Authentication now uses Better Auth 1.7.11 with pg. `database-auth.ts` provides a
server-only adapter so the existing signup/approval/password-management routes
keep their application roles and guest record ownership. Provider UUIDs still
resolve through `ggc.account_requests`. Old `sb-` cookies are ignored. Signup
never replaces an administrator's session. Duplicate signup's synthetic provider
ID is rejected before an application account can link to it. Password reset
revokes provider sessions. There is no public Better Auth catch-all handler.

`20261019040000_database_auth.sql` creates the server-only `public.ggc_auth_*`
tables. The signing key is generated once in `ggc_auth_config` and is shared by
serverless instances. Optional BETTER_AUTH_SECRET overrides it. DATABASE_URL is
the only required service credential. Supabase and Neon Auth keys are unused.

`20261019030000_database_file_storage.sql` adds `ggc.stored_files`. Uploads and
resource creation are atomic. `/api/files/posters/...` retains public poster
reads. Material documents require an administrator in the matching course.
Limits remain 2MB posters and 4MB documents. Direct browser DB roles cannot read
file bytes or authentication tables.

Apply both new migrations to Neon before testing sign-in/uploads. The supplied
Neon_Login_Upload_Update.sql wraps them in one prepared statement. It was tested
twice and preserved all 52 weeks. It contains no passwords or database URLs.
For the first administrator use `node scripts/bootstrap-admin.mjs` or apply for
a teacher account and edit/run `scripts/approve-first-admin.sql` as the Neon
owner. The SQL refuses to replace a different existing administrator.

Verification: actual Better Auth signup/signin/session/logout/password-reset
against PGlite-backed PostgreSQL passed. Next cookie encoding roundtrip passed.
Storage bytes/role/course checks passed. TypeScript and scoped server ESLint
passed. Repository-wide ESLint still reports existing UI hook/link errors.
Full regression exercised 92 cases. One obsolete Supabase CSP assertion was
updated and its focused rerun passed 2/2. The other 91 cases passed. The final
authentication test also verifies Next.js cookie parsing. A clean Turbopack
build succeeded before the final two small corrections. The local incremental
cache then failed to open. The final source passed a full Webpack release build
including TypeScript and all 33 static pages.
No private account data or secrets were inspected.

Publishing is blocked by the current connection: GitHub create-tree and
create-branch both returned 403 Resource not accessible by integration.
The CLI has no GitHub credential. Nothing was pushed or deployed. The current
GitHub account is kimhk35 and the target is kimhk35/gokbanjung main. Repository
metadata reports user push access but the integration itself refuses writes.
The Vercel connector also returns project-not-found for the known project/team.
The user authorized the GitHub browser fallback. Google sign-in and device
verification completed on 2026-10-20. The browser then failed with a retained
credential-state error before any source files were uploaded. Starting a fresh
script runtime did not recover browser access. Nothing has been committed or
deployed. The reviewed 29-file overlay is supplied as Gokbanjung_Neon_Update.zip
for one manual GitHub upload preserving its directory structure.

## Week 44 allocation and local preview — 2026-10-25

User requested adding the distribution-method review improvements and showing
next week's allocation. Branch `codex/main-baseline-20261025` starts at remote
main `52bf17b`. Existing untracked HTML mockups are preserved. No commit, push,
production database changes, or public deployment was performed.

Added finite source/link scope, workload comparison and independent source-review
templates to `docs/study/cfm-distribution-method.md`. The actual week report is
`docs/study/2026-week-44-plan.md`, with independent source metadata, source-link
decisions and assignment CSV next to it. Official weekly heading/body explicitly
includes Jeremiah36–39; the old Helps36–38 heading is documented. Local curriculum
and seed display now include39 without updating existing production records.

Week44:41 public official documents,1,363 scoped text/metadata units owned once,
0 missing/duplicate/extra assignments; basic64 tasks/1,050 units, family27/313.
Weekly9 chapters include297 logical verses, including merged Korean32:3–5 and
33:10–11 paragraphs. Additional comparisons/verses bring the total to352.
All source bodies remain official; app data holds positions/labels only. Raw HTML
and temporary inspected text stay under ignored `test-results/week44/`.
`scripts/study/audit-sources.py` collects position/count/hash metadata;
`build-week-44.py` encodes this week's reviewed boundaries and rebuilds the data.

Limits: Korean source positions are locked across UI languages. Ballard's
inspected Korean path returned404 and the linked English text is included.
Named English songs retain English. Source text inventory excludes image/PDF
interiors and video transcripts. The76:22 teacher broadcast has5 metadata units
and a full-player link, not a transcript audit. Total study time is not balanced
or participant-timed; see the daily counts and stated burden in the week report.

Added registered-week lookup and week-aware reader, shell, progress validation,
questions and local draft keys while preserving43 IDs/data. Home shows the
current week and available next week. Shell previously matched43 only; now it
uses the same plan registry so44 is public/read-first too.

Verification: full98 tests,97 pass/1 unchanged date-dependent AI quiz failure.
On Sunday2026-10-25 daily quizScope has0 chapters, on Monday10-26 it has1; the
same Sunday failure was already documented on10-18. New study/source/progress/
community tests pass. Webpack production build passes, including TypeScript and
33 static pages. Scoped ESLint passes; Shell retains its pre-existing setDark
effect error, also reproduced against the baseline source. Build-generated
tsconfig additions for the temporary output directory were removed afterward.

Actual Chrome browser checks:44 direct guest entry; Korean language;7 daily
first-source URLs; day1 p1–p3 selected and p4 unselected; End keeps selection and
positions p3 at108px in the source frame. Family day7 preserves its own range.
Responsive emulation1280x900 and390x844 has no horizontal overflow; mobile range
composer is reachable by keyboard,16px input, and private draft survives closing
and reopening. Test draft was cleared without posting. Physical touch/device
testing, all41 materials' rendered start/end borders and all translations remain
unverified. The dev-tools indicator overlapped the mobile bottom button during
one coordinate click; keyboard activation worked. This is development UI only.

Local server: session56555, `http://127.0.0.1:3000/week/44/day/1`.
Uses isolated `.local-db/week44-preview-20261025` with production DB/Auth/AI vars
cleared. Guest/session/bootstrap, home,43 and44 routes return200;52 weeks loaded
and44 reference shows36–39. `localhost` can carry unrelated old Supabase cookies
on this machine, so the verified address uses127.0.0.1. Browser deliverable stays
open on44 day1. Proofs: `test-results/week44/reader-desktop.png` and
`reader-mobile.png`. No private records or real member posts were read/created.

## Week 44: remove repeated reading entries — 2026-10-26

User requested full coverage with every assigned source position appearing once.
Version2 removes only family shared shortcuts `w44-t019` (day3 repeats day2)
and `w44-t020` (day5 repeats day6). Family activities remain on all7 days;
day3 now uses its own covenant story and scripture-play materials. Retired IDs
19/20 are reserved by the generator, preserving all other89 task objects and
existing progress mappings. Basic64 + family25 retain all1,363 units/41 sources.

Added a regression that checks the actual `studySourceUrl` selections, not just
primary ownership: every selected position belongs to that task and appears once
across all days/tracks. It failed against version1 and passes after the change.
Independent cached-HTML DOM/descendant comparison confirms no repeated selected
ranges, no missing/extra source units, and exact CSV/JSON/report correspondence.
Official source quotations, internal reference links and surrounding iframe
context remain intact. Transcript/image/PDF scope limits above are unchanged.

Verification:17 targeted study/source/progress/community tests pass; TypeScript
and scoped ESLint pass. Local44 page responded200 from the detached preview server restarted
on10-26 (the old session56555 is no longer current). A fresh UI check was blocked
by the browser URL security policy; no alternate browser workaround was used.
Previous10-25 screenshots are historical, not proofs of this correction.
