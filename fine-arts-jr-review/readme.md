# Fine Arts Junior Review

These scripts help with Fine Arts Junior Review in VAULT. They perform two actions:

- populate a "Fine Arts Junior Review students" taxonomy
- populate two permissions groups in VAULT, "FA JR film and animation students" and "FA JR exhibit students" (for all other FA programs)

The taxonomy data is used in the FAJR contribution wizard to autofill fields like "student ID" so students don't have to. The permissions groups are used in a few ways, including showing these students the FAJR collection on the **Contribute** page, filtering students to the appropriate contribution wizard page (ANIMA/FILMS vs others), and then _making other students' FAJR items visible_ when typically students cannot see each others' works.

## Setup

Uses [poetry](https://python-poetry.org) for virtual environment and dependency management.

```sh
> poetry install # install dependencies
> poetry shell # enter virtual env
```

Analogous to pipenv, we can prefix commands with `poetry run` rather than entering the venv.

## Execution

- obtain a CSV[^1] & name it fajr.csv
- `poetry run fajr fajr.csv`
- this adds usernames to the two permissions groups & generates a taxonomy CSV named "taxo.csv", then runs `upload.sh` to upload the taxonomy to EQUELLA
- afterwards the upload script offers to archive fajr.csv & taxo.csv in a "data" directory

The "fajr/process.py" script relies on a configured ".equellarc" file (see [equella-cli](https://github.com/cca/equella_cli) for details on that) with a configured OAuth token in your user's home directory, while the upload.sh script relies on the (included) `uptaxo` abstraction over EQUELLA's command-line tools for updating taxonomies. Note that, while this project is Python 3, `uptaxo` and its dependencies (equellasoap.py, util.py) are old code from EQUELLA and require a python2 binary on your path.

[^1]: Formerly this CSV was downloaded from an Informer report, now we create it from data provided by the Fine Arts office. In the future, we may use a Workday Report. The CSV must contain `id,name,major,username` as column headers.
