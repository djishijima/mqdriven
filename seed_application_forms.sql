INSERT INTO application_forms (id, code, name)
VALUES
  (gen_random_uuid(), 'APL', '稟議申請'),
  (gen_random_uuid(), 'DLY', '日報'),
  (gen_random_uuid(), 'EXP', '経費精算申請'),
  (gen_random_uuid(), 'LEV', '休暇申請'),
  (gen_random_uuid(), 'TRP', '交通費申請'),
  (gen_random_uuid(), 'WKR', '週報')
ON CONFLICT (code) DO NOTHING;
