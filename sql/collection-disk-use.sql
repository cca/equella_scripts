-- attachment size in collection
-- value1 can be non-numeric for special attachment types like below
SELECT ls.text as "Collection", ROUND(SUM(CAST(a.value1 AS BIGINT)) / 1000000, 0) as "Disk Use (mb)"
FROM attachment a
JOIN item i ON a.item_id = i.id
JOIN item_definition id ON i.item_definition_id = id.id
JOIN base_entity be ON id.id = be.id
LEFT JOIN language_string ls on be.name_id = ls.bundle_id
WHERE a.value1 NOT IN ('youtube', 'resource', 'itunesu', 'false')
GROUP BY ls.text
ORDER BY SUM(CAST(a.value1 AS BIGINT)) DESC
