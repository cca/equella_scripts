#!/usr/bin/perl

## Take an Informer export CSV & put into EQUELLA-ready upload format.
## Note: no column headers in Informer export & multi-value
## handling set to "comma-separated" or the script breaks

## Usage:
## ./course-csv-to-taxo.pl course-list.csv > output.csv
## Then take output.csv & run through EQUELLA upload script
## (not in this repo…yet)

## if the script isn't working make sure to set permissions
## for the file to be executable
## chmod 755 ProcessFiles.pl

## A couple of settings that make the warnings more verbose
## Also makes the programming a little less forgiving
use warnings;
use strict;

## Declaring the variables - good programming
my $term;
my $program;
my $coursename;
my $faculty;
my $coursecode2;
my $coursecode;
my $xlist;
my $facultyuid;
my @linearray;

## if there are no arguments print the usage block
## if there are more than one argument barf and make
## a suggestion

if ($#ARGV < 0) {
    print q{
=============================================================
|                                                           |
|                  Coded by Cian Phillips - 2014            |
|              For California College of the Arts           |
|                                                           |
|-----------------------------------------------------------|
|             Syntax - ProcessFiles.pl ARG1                 |
|                                                           |
=============================================================
};
    exit;
} elsif ($#ARGV > 0) {
    print "
    You have provided too many arguments, I'm confused.
    Check to make sure you have escaped or used single quotes
    if your filename has spaces in it.\n\n";
    exit;
}


## Sets the variable $filename to the first argument after ProcessFiles.pl
	my $filename = $ARGV[0];
## Opens the file and readies it for reading
open(my $filehandle, '<', $filename) or die "Could not open $filename\n";

## declare the special array variable type (good programming practice)
my @resultarray;

## Loops through the file line by line
## Put each line read into the $line variable
while(my $line = <$filehandle>){
	## Chomp just removes the last character (usually a return character)
    chomp $line;
    ## removes double quotes at the start of a line
    $line=~ s/^\"//;
    ## removes double quotes at the end of a line
    $line=~ s/\"$//;
    ## splits each line on "," into an array
    ## puts each value in the @linearray array into an easy to use variable
     @linearray = split(/\"\,\"/, $line);
     $term = $linearray['0'];
     $program = $linearray['1'];
     $coursename = $linearray['2'];
     $faculty = $linearray['3'];
     $coursecode2 = $linearray['4'];
     $coursecode = $linearray['5'];
     $xlist = $linearray['6'];
     $facultyuid = $linearray['7'];

     if(! defined $xlist){
     	$xlist = "NA";
     }
     if(! defined $facultyuid){
     	$facultyuid = "TBD";
     }

## take the first field 2014SP and split it into human readable $term and $year
## the =~ indicates a following regular expression that starts and ends with /
## the parens group the 'found' items which are referred to by variables named
## with their numeric order - the lower case 'd's mean digit and are escaped with
## a forward slash so it's not looking for a literal d character - uppercase 'D's
## match two non-numeric characters and plop them into the $2 variable
## if the value of $term doesn't match the 2014SP format die and throw an error
    if($term =~ /(\d\d\d\d)(\D\D)/) {
    	my $year = $1;
## if the non numeric characters match SP or FA convert them to the nicer human
## readable form and it if it doesn't match die and throw an error.
    	if($2 eq "SP"){
    		$term = "Spring";
    	}elsif ($2 eq "FA"){
    		$term = "Fall";
    	}else{
    		die "unrecognized term (not FA or SP)\n";
    	}
    	##my	$equellaready = "\"$term $year\$program\$coursename\$faculty\$coursecode2\",CrsName,$coursecode,XList,$xlist,facultyID,$facultyuid,\n";
    	my $equellaready = '"'.$term.' '.$year."\\".$coursename."\\".$faculty."\\".$coursecode2.'",CrsName,'.$coursecode.',XList,'.$xlist.',facultyID,'.$facultyuid.",\n";
    	print $equellaready;
    }else{
    	die "I don't recognize the values in the first field of the input file";
    }

##    push(@resultarray, @linearray);
}
