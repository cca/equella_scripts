# Fix Syllabi Coinstructors

See [#42](https://github.com/cca/equella_scripts/issues/42) — syllabi pushed from Portal only have the name and username of the faculty member who uploaded the syllabus, their coinstructors are missing. We iterate over accurate course data and update syllabi records in VAULT.

## Setup

Get _all_ course data since Fall 2019. Look in the gs://int_files_source_archive bucket.

```sh
gsutil -m cp -r 'gs://int_files_source_archive/course_section_data_*.json' data
```

The course_section_data_AP_Summer_2023.json file is malformed, there are newline characters in a section description. Find the `course_desc` for FURNT-1000-1 and delete the newlines (make it all one paragraph) or delete the description entirely, we do not use it.

Combine the single-term files into one monolithic courses.json file. For instance, with [miller](https://miller.readthedocs.io/en/6.12.0/):

```sh
mlr --json cat data/*.json > courses.json
```

Don't cat to a file in the same directory as the globbed source files to avoid an infinite loop.

## Usage

The script assumes our data is at data/courses.json but we can specifiy a different file with the `--courses` flag.

```sh
node fix --courses courses.json [ --dryrun ] [ --verbose ] [ --limit 10 ]
```
