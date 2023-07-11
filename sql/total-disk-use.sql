-- total disk use
SELECT ROUND(SUM(CAST(a.value1 AS BIGINT)) / 1000000, 0)
FROM attachment a
WHERE a.value1 NOT IN ('youtube', 'resource', 'itunesu', 'false')
