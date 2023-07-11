SELECT EXTRACT(year from i.date_created) as Year, ROUND(SUM(CAST(a.value1 AS BIGINT)) / 1000000, 0) as "Disk Use (mb)"
FROM attachment a
JOIN item i ON a.item_id = i.id
WHERE a.value1 NOT IN ('youtube', 'resource', 'itunesu', 'false')
-- Libraries & Syllabus Collection
AND i.item_definition_id IN (1454442, 1750370)
GROUP BY EXTRACT(year from i.date_created)
ORDER BY EXTRACT(year from i.date_created) DESC
