#!/usr/bin/env fish
# Given a log file from the retention del.js script, cut N random lines from it
# then parse the item UUID out of those lines & create commands to check their
# attachment directories on the EQUELLA server (to see if files were purged)
set numlines 10
set logfile 2025-04-07.log
set tmpfile (mktemp --tmpdir=/tmp)
set outfile commands.txt
set startln 1
set endln 2813

echo "Created temporary file" $tmpfile
echo -n >$outfile

# extract "item deleted" lines
for i in (seq 1 $numlines)
    sed -n (random $startln $endln)'p' $logfile | sed -n '/Successfully deleted item/p' >>$tmpfile
end

# adjust number because some lines might have been filtered out
set numlines (wc -l $tmpfile | cut -f 7 -d ' ')

for i in (seq 1 $numlines)
    set UUID (sed -n $i'p' $tmpfile | sed -e 's!.*items\/!!' -e 's!\/[[:digit:]]!!')
    # hashcode is a script on my PATH to get 32-bit integer hashcode from UUID
    # https://gist.github.com/phette23/9279de4260ff681cbdfc12e10275e2d3
    set hash (hashcode $UUID)
    echo "ls -l -d $hash/$UUID && tree $hash/$UUID" >>$outfile
end

echo "Run commands in $outfile as root from the 'Attachments' directory on an EQUELLA app node to verify files were purged. The commands should report that there are zero files in the given attachments directories."
