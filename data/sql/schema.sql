-- Sitio personal — schema slim (person-scoped)
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS "person" (
  "id" TEXT NOT NULL DEFAULT '',
  "name_display" TEXT NOT NULL DEFAULT '',
  "name_sort" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "email_local" TEXT NOT NULL DEFAULT '',
  "rank" TEXT NOT NULL DEFAULT '',
  "rank_en" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT '',
  "office" TEXT NOT NULL DEFAULT '',
  "office_en" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "image_path" TEXT NOT NULL DEFAULT '',
  "institution" TEXT NOT NULL DEFAULT '',
  "institution_en" TEXT NOT NULL DEFAULT '',
  "department" TEXT NOT NULL DEFAULT '',
  "department_en" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL DEFAULT '',
  "country_en" TEXT NOT NULL DEFAULT '',
  "group_name" TEXT NOT NULL DEFAULT '',
  "group_url" TEXT NOT NULL DEFAULT '',
  "orcid" TEXT NOT NULL DEFAULT '',
  "aliases_json" TEXT NOT NULL DEFAULT '[]',
  "areas_json" TEXT NOT NULL DEFAULT '[]',
  "areas_json_en" TEXT NOT NULL DEFAULT '[]',
  "url_orcid" TEXT NOT NULL DEFAULT '',
  "url_scholar" TEXT NOT NULL DEFAULT '',
  "url_scopus" TEXT NOT NULL DEFAULT '',
  "url_researcherid" TEXT NOT NULL DEFAULT '',
  "url_openalex" TEXT NOT NULL DEFAULT '',
  "url_researchgate" TEXT NOT NULL DEFAULT '',
  "url_cvlac" TEXT NOT NULL DEFAULT '',
  "url_hermes" TEXT NOT NULL DEFAULT '',
  "url_website" TEXT NOT NULL DEFAULT '',
  "url_linkedin" TEXT NOT NULL DEFAULT '',
  "url_github" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "education" (
  "id" TEXT NOT NULL DEFAULT '',
  "degree_level" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "title_en" TEXT NOT NULL DEFAULT '',
  "institution" TEXT NOT NULL DEFAULT '',
  "institution_en" TEXT NOT NULL DEFAULT '',
  "place" TEXT NOT NULL DEFAULT '',
  "place_en" TEXT NOT NULL DEFAULT '',
  "year" TEXT NOT NULL DEFAULT '',
  "thesis_title" TEXT NOT NULL DEFAULT '',
  "thesis_url" TEXT NOT NULL DEFAULT '',
  "honors" TEXT NOT NULL DEFAULT '',
  "honors_en" TEXT NOT NULL DEFAULT '',
  "extra_url" TEXT NOT NULL DEFAULT '',
  "extra_label" TEXT NOT NULL DEFAULT '',
  "extra_label_en" TEXT NOT NULL DEFAULT '',
  "sort_order" TEXT NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS "postdocs" (
  "id" TEXT NOT NULL DEFAULT '',
  "institution" TEXT NOT NULL DEFAULT '',
  "project" TEXT NOT NULL DEFAULT '',
  "project_en" TEXT NOT NULL DEFAULT '',
  "place" TEXT NOT NULL DEFAULT '',
  "place_en" TEXT NOT NULL DEFAULT '',
  "date_from" TEXT NOT NULL DEFAULT '',
  "date_to" TEXT NOT NULL DEFAULT '',
  "sort_order" TEXT NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS "languages" (
  "id" TEXT NOT NULL DEFAULT '',
  "name" TEXT NOT NULL DEFAULT '',
  "name_en" TEXT NOT NULL DEFAULT '',
  "level" TEXT NOT NULL DEFAULT '',
  "level_en" TEXT NOT NULL DEFAULT '',
  "certificate" TEXT NOT NULL DEFAULT '',
  "sort_order" TEXT NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS "intellectual_property" (
  "id" TEXT NOT NULL DEFAULT '',
  "kind" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "title_en" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "description_en" TEXT NOT NULL DEFAULT '',
  "creators" TEXT NOT NULL DEFAULT '',
  "rights_holder" TEXT NOT NULL DEFAULT '',
  "rights_holder_en" TEXT NOT NULL DEFAULT '',
  "year" TEXT NOT NULL DEFAULT '',
  "registry" TEXT NOT NULL DEFAULT '',
  "registry_en" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "url_source" TEXT NOT NULL DEFAULT '',
  "sort_order" TEXT NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS "publications" (
  "id" TEXT NOT NULL DEFAULT '',
  "doi" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "year" TEXT NOT NULL DEFAULT '',
  "date_issued" TEXT NOT NULL DEFAULT '',
  "typology" TEXT NOT NULL DEFAULT '',
  "typology_label_es" TEXT NOT NULL DEFAULT '',
  "venue_title" TEXT NOT NULL DEFAULT '',
  "authors_display" TEXT NOT NULL DEFAULT '',
  "publisher_name" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "identity_confidence" TEXT NOT NULL DEFAULT '',
  "harvest_sources" TEXT NOT NULL DEFAULT '',
  "orcid_put_codes" TEXT NOT NULL DEFAULT '',
  "harvested_at" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "theses" (
  "id" TEXT NOT NULL DEFAULT '',
  "handle" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "year" TEXT NOT NULL DEFAULT '',
  "degree" TEXT NOT NULL DEFAULT '',
  "degree_name_ri" TEXT NOT NULL DEFAULT '',
  "item_url" TEXT NOT NULL DEFAULT '',
  "student_id" TEXT NOT NULL DEFAULT '',
  "student_name" TEXT NOT NULL DEFAULT '',
  "abstract_es" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT '',
  "harvested_at" TEXT NOT NULL DEFAULT '',
  "visible" TEXT NOT NULL DEFAULT 'yes'
);

CREATE TABLE IF NOT EXISTS "students" (
  "id" TEXT NOT NULL DEFAULT '',
  "name_display" TEXT NOT NULL DEFAULT '',
  "name_sort" TEXT NOT NULL DEFAULT '',
  "degree_highest" TEXT NOT NULL DEFAULT '',
  "n_tesis" TEXT NOT NULL DEFAULT '',
  "thesis_id" TEXT NOT NULL DEFAULT '',
  "thesis_title" TEXT NOT NULL DEFAULT '',
  "thesis_year" TEXT NOT NULL DEFAULT '',
  "thesis_degree" TEXT NOT NULL DEFAULT '',
  "thesis_url" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "courses" (
  "id" TEXT NOT NULL DEFAULT '',
  "term" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "level" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "current" TEXT NOT NULL DEFAULT 'no',
  "sort_order" TEXT NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" TEXT NOT NULL DEFAULT '',
  "slug" TEXT NOT NULL DEFAULT '',
  "title_short" TEXT NOT NULL DEFAULT '',
  "title_short_en" TEXT NOT NULL DEFAULT '',
  "title_full" TEXT NOT NULL DEFAULT '',
  "title_full_en" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "summary_en" TEXT NOT NULL DEFAULT '',
  "detail_json" TEXT NOT NULL DEFAULT '[]',
  "detail_json_en" TEXT NOT NULL DEFAULT '[]',
  "links_json" TEXT NOT NULL DEFAULT '[]',
  "sort_order" TEXT NOT NULL DEFAULT '0',
  "visible" TEXT NOT NULL DEFAULT 'yes'
);

PRAGMA foreign_keys = ON;
