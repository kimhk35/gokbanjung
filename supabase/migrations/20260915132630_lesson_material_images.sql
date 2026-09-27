create table ggc.lesson_materials (
 id uuid primary key default gen_random_uuid(),
 course_id text not null references ggc.courses(id),
 owner_id uuid not null references ggc.actors(id),
 title text not null check(length(title) between 1 and 120),
 weeks integer[] not null check(cardinality(weeks) between 1 and 52 and 1<=all(weeks) and 52>=all(weeks)),
 slide_count integer not null check(slide_count between 1 and 40),
 status text not null default 'draft' check(status in ('draft','ready')),
 created_at timestamptz not null default now()
);
create table ggc.lesson_material_slides (
 material_id uuid not null references ggc.lesson_materials(id) on delete cascade,
 slide_index integer not null check(slide_index between 0 and 39),
 image text not null check(length(image)<=750000 and image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'),
 primary key(material_id,slide_index)
);
alter table ggc.lesson_materials enable row level security;
alter table ggc.lesson_material_slides enable row level security;
grant select,insert,update,delete on ggc.lesson_materials,ggc.lesson_material_slides to authenticated;
revoke all on ggc.lesson_materials,ggc.lesson_material_slides from anon;
create policy lesson_material_read on ggc.lesson_materials for select to authenticated using(ggc.teaches(course_id) and (status='ready' or owner_id=ggc.uid() or ggc.is_admin()));
create policy lesson_material_insert on ggc.lesson_materials for insert to authenticated with check(ggc.teaches(course_id) and owner_id=ggc.uid());
create policy lesson_material_update on ggc.lesson_materials for update to authenticated using(ggc.teaches(course_id) and (owner_id=ggc.uid() or ggc.is_admin())) with check(ggc.teaches(course_id) and (owner_id=ggc.uid() or ggc.is_admin()));
create policy lesson_material_delete on ggc.lesson_materials for delete to authenticated using(ggc.teaches(course_id) and (owner_id=ggc.uid() or ggc.is_admin()));
create policy lesson_slide_read on ggc.lesson_material_slides for select to authenticated using(exists(select 1 from ggc.lesson_materials m where m.id=material_id));
create policy lesson_slide_insert on ggc.lesson_material_slides for insert to authenticated with check(exists(select 1 from ggc.lesson_materials m where m.id=material_id and m.status='draft' and m.owner_id=ggc.uid()));
create policy lesson_slide_update on ggc.lesson_material_slides for update to authenticated using(exists(select 1 from ggc.lesson_materials m where m.id=material_id and m.status='draft' and m.owner_id=ggc.uid())) with check(exists(select 1 from ggc.lesson_materials m where m.id=material_id and m.status='draft' and m.owner_id=ggc.uid()));
create index lesson_material_course_date on ggc.lesson_materials(course_id,created_at desc);
create index lesson_material_owner on ggc.lesson_materials(owner_id);
