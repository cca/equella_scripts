# Fine Arts Junior Review

These scripts help with workflows surrounding Fine Arts Junior Review in VAULT. They do two primary things:

- populate a "Fine Arts Junior Review students" taxonomy
- populate two permissions groups in VAULT, "FA JR film and animation students" and "FA JR exhibit students" (all other programs)

The taxonomy data is pulled into the FAJR contribution wizard to autofill fields like "student ID" so that students don't have to. The permissions groups are used in a few ways, including showing these students the FAJR collection on the Contribute page, filtering students to the appropriate contribution wizard page (ANIMA/FILMS vs others), and then making _other students' FAJR items visible_ when typically students cannot see each others' works.

## Usage

Transferring data to VAULT looks like this:

- obtain a CSV from Fine Arts [1] & name it fajr.csv
- run `python fajr_process.py --semester "Fall 2020" fajr.csv ` (where "Fall 2020" is the current semester)
- this adds usernames to the two permissions groups, generates a taxonomy CSV named "taxo.csv", uploads the taxonomy to openEQUELLA, then offers to archive fajr.csv & taxo.csv in a "data" directory

fajr_process.py relies on a configured ".equellarc" file (see [equella-cli](https://github.com/cca/equella_cli) for details) with a configured OAuth token in your user's home directory, while the upload.sh script relies on that as well as the (included) `uptaxo` abstraction over openEQUELLA's command-line tools for updating taxonomies. Inside fajr_process.py there is a mapping of various strings to formatted CCA majors; these must be updated over time as majors are created or changed.

Due to our dependency on oE's tools we must use Python 2. We use `pipenv`; all we need to do is run `pipenv install` once to get the virtualenv and then `pipenv shell` to enter it once we're ready to run these scripts.

[1] Formerly this CSV was downloaded from the Informer report "LIB - EP - Library - Fine Arts Junior Review Students". Now we receive the data directly from the Fine Arts office now. In any case, the important thing is that the CSV contains these columns in this order (but no header row):

`studentID,givenname,surname,major,username`
