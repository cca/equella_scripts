#!/usr/bin/env fish
# iterate over an input file of faculty names
set file $argv[1]
[ -z $file ] && set file faculty.txt
mkdir -p faculty

for name in (cat $file)
    echo (date) "Downloading syllabi for $name"
    # download all available syllabi
    node facfiles.js --name "$name" --start_term 'Fall 2018' --stop_term 'Spring 2022'
    # put them into their own directory
    mv -v files/* "faculty/$name.zip"
    # clear out the files directory for next time
    rm files/*
end
