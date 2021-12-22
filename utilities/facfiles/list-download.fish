#!/usr/bin/env fish
# iterate over an input file of faculty names
set file $argv[1]
[ -z $file ] && set file faculty.txt

for name in (cat $file)
    echo (date) "Downloading syllabi for $name"
    # download all available syllabi
    node facfiles.js --name "$name" --start_term 0 --stop_term 0
    # zip them up
    zip -r "$name.zip" files -x files/.gitkeep -x files/.DS_Store
    # clear out the directory for next time
    rm files/*
end
