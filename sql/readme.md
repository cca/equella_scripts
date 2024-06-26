# SQL Queries

We can run queries by sshing onto either app node and then connecting to the postgres database from there. The database server rejects connections from other IP addresses. There is a mismatch between the `psql` client and postgres server versions but it should work OK. These are the basic steps:

```sh
ssh v2 # where v2 is an ssh alias for one of the app nodes
# the connection details can be found in a configuration file on the server
# then you can write the command below into a script
PGPASSWORD=secret postgres -h dbhost.cca.edu -U equella_db_user equella_db_name
equella_db_name=> SELECT * FROM attachment a JOIN item i ON a.item_id = i.id LIMIT 1;
```

Once in the psql client, we can export query results to a CSV with a few extra commands:

```sh
equella_db_name=>\f ','
equella_db_name=>\a
equella_db_name=>\o '/Users/ephetteplace/output.csv'
equella_db_name=>SELECT * FROM item LIMIT 10000;
```

There will be no output when we run the query because it's being written to the CSV. This approach is better for copy-pasting the multiline queries like the ones stored here but is naïve about commas (e.g. in `attachment.description` or entity name fields). To get a true CSV, use the psql `\copy` command with the full query written in parentheses:

```sql
\copy (SELECT * FROM attachment a) To '/Users/ephetteplace/output.csv' With CSV DELIMITER ',' HEADER
```

## Database Structure

There are useful tutorials and documentation in the openEQUELLA repo's Tutorials > [Reporting)(https://github.com/openequella/openequella.github.io/tree/master/tutorials/reporting) folder.

`attachment.value1` appears to be the attachment file size. Note that it is a VARCHAR field which sometimes contains text values for special attachment types (like references to other items or links to YouTube). In general, we must cast it to an integer and skip these other values in the `WHERE` clause:

```sql
SELECT a.description, CAST(a.value1 as BIGINT) as size
FROM attachment a
WHERE value1 NOT IN ('youtube', 'resource', 'itunesu', 'false')
```

Most human-readable names/values are stored in the `language_string` table and not on the tables of the objects themselves, like `item` or `item_definition` (which is what collections are). Lang strings are only connected to entries in the `base_entity` table. So something as simple as finding the name of an item or collection involves joining all three tables together:

```sql
SELECT ls.text AS Name
FROM item_definition id
JOIN base_entity be ON id.id = be.id
LEFT JOIN language_string ls ON be.name_id =ls.bundle_id
```
