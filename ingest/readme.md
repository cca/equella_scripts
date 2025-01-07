# VAULT Bulk Ingest

Use a CSV with metadata columns and relative paths of attachments to create VAULT items.

## Setup

This tool uses [uv](https://docs.astral.sh/uv/).

```sh
brew install uv # make uv globally available
uv sync # create venv and install dependencies
source .venv/bin/activate.fish # enter venv
```

We also need a VAULT OAuth token with appropriate permissions (e.g. can create/draft items in a given collection).

## Usage

```sh
> python src/ingest.py -h
Usage: ingest.py [OPTIONS] input.csv

Options:
  -h, --help             Show this message and exit.
  --version              Show the version and exit.
  -c, --collection TEXT  Name of collection to add items to  [required]
  -d, --debug            Debug (do not create items)
  --draft                Create draft item
  -t, --token TEXT       VAULT access token  [required]
  -v, --verbose          Print diagnostic messages.
> # create draft items in Test Collection with verbose output (using token in .equellarc file)
> python src/ingest.py -c "Test Collection" -v --draft -t (jq -r .token ~/.equellarc) items.csv
```

## CSV Format

Right now, only basic course information fields are supported. All fields are required. Example:

| semester | course_title | section_code | student | files |
|----------|--------------|--------------|---------|-------|
| Fall 2024 | Intro to the Arts | ARTED-1000-1 | "Phetteplace,  Eric" | text.docx&#124;matta.jpg |

File paths are "|" pipe-separated. Paths are relative to the CSV and must be in or beneath the CSV's parent directory ("../file.txt" is not a viable path). Files with vertical bars in their names should be renamed, or this tool modified to use a configurable separator.
