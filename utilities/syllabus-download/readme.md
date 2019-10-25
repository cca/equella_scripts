# Bulk Download Syllabus Files

The purpose of this script is to provide a way to easily supply a department with copies of all their syllabi in VAULT, e.g. so they can be included in an external review or other assessment activity. It downloads all the syllabi items in VAULT for one or more programs, finds the sections within a provided range of academic terms, and saves their attachments in the "files" directory with filenames of form "Spring 2017 ILLUS-230-01 Tools_ Hand-Lettering.pdf" e.g. semester, followed by section code, followed by course name.

To run the script:

- ensure you have node & npm
- run `npm install` to get dependencies
- obtain an API access token from VAULT & put it in a text file named ".token" in this folder
- edit index.js (see the `programs` and `semesters` variables towards the top)
- run `node index` to download the files

If running repeated times, you may want to clean out the files directory in between. The script is meant to be flexible enough to extract multiple years of syllabi from multiple departments. To get _all_ syllabi, you could simply remove the `where` parameter from the initial API requests.
