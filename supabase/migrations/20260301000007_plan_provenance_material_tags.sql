-- Plan provenance (built-in sample vs blank/custom) + material tags for filtering
alter table plans
  add column if not exists source_template_id text;

alter table materials
  add column if not exists tags text[] not null default '{}';

comment on column plans.source_template_id is 'Built-in sample id (e.g. jlpt-n2) or null for blank/custom/imported';
comment on column materials.tags is 'App categories: grammar, vocab, kanji, reading, listening, mock, other';
