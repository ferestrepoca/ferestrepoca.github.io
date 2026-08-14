-- seed: languages (3 rows)
DELETE FROM "languages";
INSERT INTO "languages" ("id", "name", "name_en", "level", "level_en", "certificate", "sort_order") VALUES ('lang:es', 'Español', 'Spanish', 'Nativo', 'Native', '', '1');
INSERT INTO "languages" ("id", "name", "name_en", "level", "level_en", "certificate", "sort_order") VALUES ('lang:en', 'Inglés', 'English', 'C1', 'C1', 'Cambridge Certificate in Advanced English (CAE); CEFR C1', '2');
INSERT INTO "languages" ("id", "name", "name_en", "level", "level_en", "certificate", "sort_order") VALUES ('lang:pt', 'Portugués', 'Portuguese', 'Básico', 'Basic', '', '3');
