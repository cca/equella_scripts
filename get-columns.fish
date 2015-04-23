#!/usr/bin/env fish
# from an Informer export of all course information for a department
# use Python's csvkit to extract lists of faculty, course sections, names, & titles
# usage:
# ./get-columns.fish informer-export.csv DEPT
# e.g.
# > ./get-columns.fish pntdr-export.csv PNTDR

# will fail with an error if either of these args is missing
set --local filename $argv[1]
set --local dept $argv[2]

csvcut -c 3 $filename | sort | uniq > $dept-course-titles.csv
and echo "Wrote $dept course titles CSV…"
csvcut -c 4 $filename | sort | uniq > $dept-faculty-names.csv
and echo "Wrote $dept faculty names CSV…"
csvcut -c 5 $filename | sort | uniq > $dept-section-names.csv
and echo "Wrote $dept section names CSV…"
csvcut -c 6 $filename | sort | uniq > $dept-courses.csv
and echo "Wrote $dept courses CSV…"

# @TODO: handle case where we need to pass --program flag to perl script
# first sort file (first column is semester), then process
cat $filename | sort -o $filename;
course-csv-to-taxo.pl $filename > $dept-course-list-taxo.csv
and echo "Created EQUELLA-ready '$dept - COURSE LIST' taxonomy CSV"
