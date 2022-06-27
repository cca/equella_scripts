# Bulk Download Syllabus Files

The purpose of this script is to provide a way to easily supply a department with copies of all their syllabi in VAULT, e.g. so they can be included in an external review or other assessment activity. It downloads all the syllabi items in VAULT for one or more programs, finds the sections within a provided range of academic terms, and saves their attachments in the "files" directory with filenames of form "Spring 2017 ILLUS-230-01 Tools_ Hand-Lettering.pdf" e.g. semester, followed by section code, followed by course name.

See also: the facfiles tool for downloading syllabi from particular faculty members.

## Setup

- ensure we have node & npm
- run `pnpm install` (preferred) or `npm install` to get dependencies
- if you don't already have an .equellarc file, obtain an OAuth token from VAULT & create one (details on .equellarc are in the equella-cli project)
- edit index.js (see `semesters` variable towards the top)

## Usage

Run `node index --programs ANIMA,ARTED` to download the files, where the `--programs` flag is all the department codes to include.

We can include a `q` freetext query to further refine results `node index --programs ANIMA --q games`.

If running repeated times, we may want to clean out the files directory in between. The script is meant to be flexible enough to extract multiple years of syllabi from multiple departments. To get _all_ syllabi, simply remove the `where` parameter from the initial API requests.

If we're downloading hundreds of syllabi at a time, we can split them up into smaller batches by editing the `semesters` variable so the multiple requests to VAULT don't time out.
