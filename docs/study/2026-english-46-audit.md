# Week 46 English source alignment

Reviewed 2026-11-15 against the official English documents at the same Church source paths as the existing allocation. This adds a language edition, not another seven-day allocation. The 111 original task IDs, days, tracks, progress units, Korean ranges and teacher question remain unchanged.

## Result and scope

- 56 official English sources and 111 task variants; no fallback-only tasks.
- 1,284 selected English body units and 610 English footnote units, each owned once within the week.
- All 342 logical scripture verses remain in the same task as the original allocation. English paragraphs were selected by their parsed verse numbers, not by assuming paragraph IDs represent the same verses.
- The expected scope is derived from the original source inventory before assigning English task ranges: whole corresponding articles/chapters/songs, the original verse subsets, and the original artwork numbers. The expected body/footnote set equals the assigned set, with no missing or duplicate units.
- `2026-english-46-sources.json` contains this expected English scope, positions, hashes and note owners. `excluded` records bibliography, unlinked Notes headings and units outside the original verse/artwork scope. Full source text/HTML stays only in ignored `test-results/english46/`.

## Reviewed differences

| Source | English alignment decision |
| --- | --- |
| Weekly manual | Five Scripture Helps link IDs differ. Map `p_nB6xw → p_pcUeL`, `p_e7qM9 → p_aOreu`, `p_iRdkd → p_tbV44`, `p_gSvZd → p_cjtSM`, and `p_grqLE → p_f6Sjz` after comparing the link questions, destinations and section context. All other manual boundaries were checked against their corresponding meaning. |
| Scripture Helps | The questions, explanations, Daniel/Christ comparison table, references and existing captions have matching meaning and IDs. The English-only `p_cxFO0` caption belongs to the Adam-ondi-Ahman image at the end of the Ancient of Days explanation, so task `w46-t070` owns it. Repeated mobile table headings are excluded by the source parser. |
| Children’s resources | Every activity, scripture reference and destination was compared; their shared IDs refer to the corresponding activities. The English-original monthly activity article retains its original activity boundaries and unchanged body hashes. |
| Bible chapters | Korean section headings differ from English chapter summaries. A task that owned the original chapter headings owns the English chapter heading/summary once. Partial verse tasks include only their assigned logical verses. Verse sets match in every task. |
| Seven split conference talks | The full paragraph-ID sequence, meaning at each split boundary, and scripture links in corresponding footnotes were compared. All boundaries retain their intended topic. Two reference differences are acceptable: Uchtdorf’s Daniel 3 link has no verse fragment in English; Bednar’s English note additionally links to the Bible Dictionary entry “Gospels.” Actual English notes and owners are used. |
| “But If Not …” | This is a whole-article task. The final Korean paragraphs `p36` and `p37` correspond to English `p37` and `p38`; selecting the complete English body preserves the ending rather than copying the Korean endpoint. |
| Gospel Art Book | Artwork numbers, titles and scripture-reference pairs were checked using `data-marker`, including 23, 25, 26 and 90–95. Nine English artist/rightsholder captions are included with their respective artwork. Church-history 90–95 are First Vision through Elijah at Kirtland, not local figure numbers 90–95. |
| Whole stories, songs and other articles | Select their full English counterpart, allowing different translated paragraph grouping, song numbers and captions. Their complete scope stays within the original source inventory. |

The English manual’s overview links to the Bible Dictionary “Daniel,” while the Korean manual points to the Guide to the Scriptures “Daniel.” The existing assigned Guide to the Scriptures article is retained in English, preserving the authorized source inventory; the English manual’s own additional link remains accessible. This does not claim an audit of every extra reference unique to the English translation.

## Media limits

The manual’s `figure8` is the official “God Gave Them Knowledge” player. The verified English label is **13:49**, compared with 13:57 in the Korean source. The variant selects the actual player and clearly labels the full video as transcript-unverified. Scripture Helps lists “The Gospel Shall Roll Forth” as 2:47 in English versus 2:44 in Korean; its English source text is used. These checks verify source identity, player position and displayed duration, not spoken-word transcript coverage. The original practice of using complete story texts with their video alternatives is preserved.

## Verification and regeneration

`scripts/study/build-english-46.py` reads the existing allocation and independently scoped source inventory, then verifies source language, exact verse sets, range ownership, note ownership and coverage before writing the edition and audit files. Subsequent runs compare cached HTML hashes with the recorded reviewed manifest and stop if a source response changed. Every variant contains `original: {path, sourceLang, anchor, endAnchor, selectedIds}` so the runtime can refuse an obsolete mapping if the allocation changes.

Additional independent checks against the cached HTML confirmed:

- all selected anchors and footnote anchors exist in the actual English document;
- every footnote owner belongs to its task’s selected English body;
- no selected body element contains another selected element;
- all 111 original range signatures exactly match the unchanged canonical tasks;
- all 342 logical verses have identical per-task membership in both languages;
- every main article contains English text without a Korean fallback response.

The generator was rerun successfully against the recorded source hashes. The lead agent owns the application tests and browser verification. No production data, source allocation, commit, push or deployment was changed by this source audit.
