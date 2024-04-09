-- Custom SQL migration file, put you code below! ---- Custom SQL migration file, put you code below! --
CREATE OR REPLACE VIEW source_zips AS
SELECT c.id, c.name, c.namespace, c.domain, c.resource_type, c.created_on, c.modified_on, CONCAT(g.repo_url, '/archive/master.zip') AS zip_url, COUNT(DISTINCT srm.book_slug) AS unique_book_slugs_count, 
m.show_on_biel, m.status AS meta_status, l.national_name as language_name, l.english_name as language_english_name

FROM content c
JOIN rendered_content r ON r.content_id = c.id
JOIN scriptural_rendering_metadata srm ON srm.rendering_id = r.id
JOIN git_repo g ON g.content_id = c.id
JOIN wa_content_metadata m ON m.content_id = c.id
JOIN language l on c.language_id = l.ietf_code
AND g.username ilike 'wa-catalog'
GROUP BY c.id, CONCAT(g.repo_url, '/archive/master.zip'), m.id, l.national_name, l.english_name