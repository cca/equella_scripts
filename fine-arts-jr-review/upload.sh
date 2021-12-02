#!/usr/bin/env bash
# sort the taxonomy, just helps when reading through it in admin console
sort taxo.csv > tmp; mv tmp taxo.csv
# upload it
python2 uptaxo --un $(jq -r .username ~/.equellarc) --pw $(jq -r .password ~/.equellarc) --csv taxo.csv --tid $(eq tax --name 'Fine Arts Junior Review students' | jq -r .uuid) --start 2

# give option to archive CSVs in data dir
echo -n 'Archive fajr.csv & taxo.csv in the "data" directory? (y/n) '
read -n 1 archive
if [ $archive == 'y' ]; then
    echo && mkdir -p data
    mv -v fajr.csv data/$(date "+%Y-%m-%d").csv
    mv -v taxo.csv data/$(date "+%Y-%m-%d")-taxo.csv
fi
