-- 必要なら拡張
create extension if not exists pgcrypto;

-- テーブル（無ければ作成）
create table if not exists application_forms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- コードを正規化した6種をUPSERT
insert into application_forms (code,name,description) values
('EXP','経費精算申請','出張費や備品購入費などの精算'),
('TRP','交通費申請','業務上の移動にかかった交通費'),
('LEV','休暇申請','有給・欠勤など'),
('APL','稟議申請','契約等の承認'),
('DLY','日報','日々の業務報告'),
('WKR','週報','週間の業務報告')
on conflict (code) do update
set name = excluded.name, description = excluded.description;

-- 確認
select code,name from application_forms order by code;
