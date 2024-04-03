CREATE OR REPLACE VIEW source_zips AS
SELECT c.*, CONCAT(g.repo_url, '/archive/master.zip') AS zip_url, COUNT(DISTINCT srm.book_slug) AS unique_book_slugs_count, 
m.show_on_biel, m.status AS meta_status, l.national_name, l.english_name

FROM content c
JOIN rendering r ON r.content_id = c.id
JOIN scriptural_rendering_metadata srm ON srm.rendering_id = r.id
JOIN git_repo g ON g.id = c.git_id
JOIN wa_content_meta m ON m.content_id = c.id
JOIN language l on c.language_id = l.ietf_code
WHERE c.domain = 'scripture'
AND m.show_on_biel = false
AND m.status = 'Active'
AND c.git_id IS NOT NULL
GROUP BY c.id, CONCAT(g.repo_url, '/archive/master.zip'), m.id, l.national_name, l.english_name
HAVING COUNT(DISTINCT srm.book_slug) > 26