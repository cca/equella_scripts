import csv
from pathlib import Path

import click

from coll import collections


APP_PREFIX = "INGEST"


@click.command("ingest")
@click.help_option("-h", "--help")
@click.version_option("0.1.0")
@click.argument(
    "csvfile",
    metavar="input.csv",
    type=click.Path(exists=True, readable=True, dir_okay=False, path_type=Path),
)
@click.option(
    "-c", "--collection", required=True, help="Name of collection to add items to"
)
@click.option("-t", "--token", required=True, help="VAULT access token")
@click.option("-v", "--verbose", is_flag=True, help="Print diagnostic messages.")
def main(csvfile: Path, collection="", token="", verbose=False):
    collection_uuid: str | None = collections.get(collection, None)
    if not collection_uuid:
        click.echo(
            f"ERROR: unrecognized collection {collection}. Pass the name of a VAULT collection with the -c or --collection flag or use the {APP_PREFIX}_COLLECTION env var."
        )
        exit(1)

    root_dir = csvfile.parent.resolve()
    if verbose:
        click.echo(f"Root directory: {root_dir}")

    with csvfile.open("r") as fh:
        reader = csv.DictReader(fh)
        for index, row in enumerate(reader):
            if verbose:
                click.echo(f"Processing row no. {index + 1}")
            failure = False

            # map filenames to paths & ensure they 1) exist & 2) are under root_dir (prevent path traversal)
            files = map(
                lambda f: (root_dir / Path(f)).resolve(), row["files"].split("|")
            )
            for file in files:
                if not file.exists():
                    click.echo(f"Error: unable to find file at path {file}", err=True)
                    failure = True
                if root_dir not in file.parents:
                    click.echo(
                        f"Error: {file} path points outside the root {root_dir} path",
                        err=True,
                    )

            if failure:
                click.echo(f"Skipping row no. {index + 1} due to errors", err=True)
                continue

            # create item, create file space, add files in parallel with httpx, publish item
            # can model after Portal syllabus integration


if __name__ == "__main__":
    main(auto_envvar_prefix=APP_PREFIX)
