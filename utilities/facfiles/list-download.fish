#!/usr/bin/env fish
# iterate over an input file of faculty names
set file $argv[1]
[ -z $file ] && set file faculty.txt
set start_term $argv[2]
if [ -z $start_term ]
    set start_term ""
else
    set start_term "--start_term='$start_term'"
end
mkdir -p faculty

for name in (cat $file)
    echo (date) "Downloading syllabi for $name"
    # download all available syllabi
    node facfiles.js --name "$name" $start_term
    # put them into their own directory
    set dirname (echo $name | tr -d '\\/()[]{}*?!')
    mkdir -p "faculty/$dirname"
    mv -v files/* "faculty/$dirname"
    if [ $status -ne 0 ];
        set_color red
        echo "No files were downloaded for $name"
        set_color normal
    end
end
