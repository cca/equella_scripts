-- examples of items with non-file attachments for migration testing
SELECT a.type,
-- data contains XML with line breaks for "custom" attachments which mangles psql CSV output
-- a.data,
a.description,
a.url,
a.value1,
i.owner,
i.uuid,
i.version
FROM attachment a
JOIN item i ON a.item_id = i.id
WHERE a.type != 'file';
