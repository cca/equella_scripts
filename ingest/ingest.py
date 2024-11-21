import csv
import os

import click


@click.command("ingest")
@click.help_option("-h", "--help")
@click.version_option("0.1.0")
@click.argument("csvfile", type=click.File("r"), metavar="input.csv")
@click.option("-v", "--verbose", is_flag=True, help="Print diagnostic messages.")
def main(csvfile, verbose=False):
    reader = csv.DictReader(csvfile)
    for index, row in enumerate(reader):
        if verbose:
            click.echo(f"Processing row no. {index + 1}")
        failure = False

        # ensure files exist
        files = row["files"].split("|")
        for file in files:
            if not os.path.exists(file):
                click.echo(f"Error: unable to find file at path {file}", err=True)
                failure = True

        if failure:
            click.echo(f"Skipping row no. {index + 1} due to errors", err=True)
            continue

        # create item, create file space, add files in parallel with httpx, publish item
        # can model after Portal syllabus integration


if __name__ == "__main__":
    main()
