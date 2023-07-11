SELECT ls.text as "Collection", id.id, be.uuid
FROM item_definition id
JOIN base_entity be ON id.id = be.id
LEFT JOIN language_string ls on be.name_id = ls.bundle_id
