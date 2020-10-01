# Fine Arts Junior Review

These scripts help with workflows surrounding Fine Arts Junior Review in VAULT. They do two primary things:

- populate a "Fine Arts Junior Review students" taxonomy
- populate two permissions groups in VAULT, "FA JR film and animation students" and "FA JR exhibit students" (all other programs)

The taxonomy data is pulled into the FAJR contribution wizard to autofill fields like "student ID" so that students don't have to. The permissions groups are used in a few ways, including showing these students the FAJR collection on the Contribute page, filtering students to the appropriate contribution wizard page (ANIMA/FILMS vs others), and then making _other students' FAJR items visible_ when typically students cannot see each others' works.

Transferring data to VAULT looks like this:

- obtain a CSV [1] & name it fajr.csv
- run `python fajr_process.py fajr.csv "Fall 2019"` (where "Fall 2019" is the current semester)
- this adds usernames to the two permissions groups & generates a taxonomy CSV named "taxo.csv"
- run `./upload.sh` (no arguments) to upload the taxonomy to EQUELLA, it expects the "taxo.csv" file
- afterwards the upload script offers to archive fajr.csv & taxo.csv in a "data" directory

The "fajr-process.py" script relies on a configured ".equellarc" file (see [equella-cli](https://github.com/cca/equella_cli) for details on that) with a configured OAuth token in your user's home directory, while the upload.sh script relies on the (included) `uptaxo` abstraction over EQUELLA's command-line tools for updating taxonomies.

[1] Formerly this CSV was downloaded from the Informer report "LIB - EP - Library - Fine Arts Junior Review Students". Now we receive the data directly from the Fine Arts office now. In any case, the important thing is that the CSV contains these columns in this order (but no header row):

`studentID,givenname,surname,major,username`
