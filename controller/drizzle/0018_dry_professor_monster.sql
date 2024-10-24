-- Custom SQL migration file, put you code below! --
-- Custom SQL migration file, put your code below! --
-- View: public.vw_langnames

CREATE OR REPLACE VIEW public.vw_langnames
  AS
SELECT language.ietf_code AS lc,
  language.national_name AS ln,
  language.english_name AS ang,
  language.direction AS ld,
  CASE
    WHEN (
      EXISTS ( 
        SELECT 1 FROM wa_language_meta WHERE wa_language_meta.ietf_code = language.ietf_code AND wa_language_meta.is_gateway
        )
      ) THEN true
    ELSE false
  END AS gw,
  array_agg(DISTINCT country_cc.alpha_2) AS cc,
  array_remove(array_agg(DISTINCT language_alternate_name.name), NULL::text) AS alt,
  language.home_country_alpha2 AS hc,
  world_region.region AS lr,
  1 AS pk
FROM language
  LEFT JOIN country_to_language ON language.ietf_code::text = country_to_language.language_ietf_code::text
  LEFT JOIN country AS country_cc ON country_to_language.country_alpha_2::text = country_cc.alpha_2::text
  LEFT JOIN country AS country_hc ON language.home_country_alpha2::text = country_hc.alpha_2::text
  LEFT JOIN language_alternate_name ON language.ietf_code::text = language_alternate_name.ietf_code::text
  LEFT JOIN world_region ON country_hc.world_region_id = world_region.id
  LEFT JOIN wa_language_meta on language.ietf_code::text =  wa_language_meta.ietf_code::text
GROUP BY language.ietf_code, language.national_name, language.english_name, language.direction, world_region.region;
