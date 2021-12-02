# Fine Arts Junior Review

These scripts help with Fine Arts Junior Review in VAULT. They perform two actions:

- populate a "Fine Arts Junior Review students" taxonomy
- populate two permissions groups in VAULT, "FA JR film and animation students" and "FA JR exhibit students" (for all other FA programs)

The taxonomy data is used in the FAJR contribution wizard to autofill fields like "student ID" so students don't have to. The permissions groups are used in a few ways, including showing these students the FAJR collection on the **Contribute** page, filtering students to the appropriate contribution wizard page (ANIMA/FILMS vs others), and then _making other students' FAJR items visible_, when typically students cannot see each others' works.

## Setup

Uses [poetry](https://python-poetry.org) for virtual environment and dependency management.

```sh
> poetry install # install dependencies
> poetry shell # enter virtual env
```

You can also prefix commands with `poetry run` rather than entering the venv.

## Execution

Transferring data to VAULT looks like this:

- obtain a CSV [1] & name it fajr.csv
- run `./fajr-process.py fajr.csv "Fall 2019"` (where "Fall 2019" is the current semester)
- this adds usernames to the two permissions groups & generates a taxonomy CSV named "taxo.csv", then runs `./upload.sh` to upload the taxonomy to EQUELLA
- afterwards the upload script offers to archive fajr.csv & taxo.csv in a "data" directory

The "fajr-process.py" script relies on a configured ".equellarc" file (see [equella-cli](https://github.com/cca/equella_cli) for details on that) with a configured OAuth token in your user's home directory, while the upload.sh script relies on the (included) `uptaxo` abstraction over EQUELLA's command-line tools for updating taxonomies. Note that, while this project is Python 3, `uptaxo` is old code from EQUELLA and requires a python2 binary on your path.

[1] Formerly this CSV was downloaded from the Informer report "[LIB - EP - Library - Fine Arts Junior Review Students](https://vm-informer-01.cca.edu/informer/?locale=en_US#action=ReportRun&reportId=79626253&launch=false)" with column headers on. We can also get it sent to us from the Fine Arts office. In the future, we may use a Workday Report. In any case, the important thing is that the CSV contains these column headers:

`studentID,givenname,surname,major,username`
