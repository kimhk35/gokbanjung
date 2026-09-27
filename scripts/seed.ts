import { writeFile, readdir } from "node:fs/promises";
import { curriculum, fields, reading, COURSE } from "../src/lib/curriculum";
const q = (x: unknown) =>
  "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
const sql = [
  `insert into ggc.courses(id,title,start_date) values('${COURSE}',${q({ ko: "와서 나를 따르라 · 2026 구약전서", en: "Come, Follow Me · Old Testament 2026" })},'2025-12-29');`,
];
for (const w of curriculum) {
  sql.push(
    `insert into ggc.weeks(id,course_id,data,status) values(${w.number},'${COURSE}',${q(w)},'published');`,
  );
  sql.push(
    `insert into ggc.worksheets(course_id,week,items) values('${COURSE}',${w.number},${q(fields)});`,
  );
  for (let day = 1; day <= 7; day++)
    sql.push(
      `insert into ggc.daily_lessons(id,week,day,data) values('${w.number}-${day}',${w.number},${day},${q({ reference: { ko: reading(w, day, "ko"), en: reading(w, day, "en") }, provenance: "suggested_daily_distribution", sourcePage: w.sourcePage })});`,
    );
}
sql.push(
  `insert into ggc.site_settings(key,value) values('moderation','"automatic"'),('timezone','"Asia/Seoul"');`,
);
await writeFile("supabase/seed.sql", sql.join("\n"));
let schema = await import("node:fs/promises").then((fs) =>
  fs.readFile("scripts/schema.sql", "utf8"),
);
schema = schema.replace(/create function ggc.uid\(\).*?\$\$;\n/s, "");
const file = (await readdir("supabase/migrations")).find((x) =>
  x.endsWith("_gospel_learning.sql"),
)!;
await writeFile("supabase/migrations/" + file, schema);
console.log("52 weeks / 364 daily reading plans / 52 bilingual worksheets");
