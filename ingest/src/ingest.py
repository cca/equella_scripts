import csv
import mimetypes
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import click
import httpx

from coll import collections


APP_PREFIX = "INGEST"


def debug_response(debug: bool, r: httpx.Response):
    if debug:
        click.echo(f"{r.request.method} {r.request.url}")
        click.echo(r.headers)


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
@click.option("-d", "--debug", is_flag=True, help="Debug (do not create items)")
@click.option("--draft", is_flag=True, help="Create draft item")
@click.option("-t", "--token", required=True, help="VAULT access token")
@click.option("-v", "--verbose", is_flag=True, help="Print diagnostic messages.")
def main(
    csvfile: Path,
    collection: str = "",
    debug: bool = False,
    draft: bool = False,
    token: str = "",
    verbose: bool = False,
):
    collection_uuid: str | None = collections.get(collection, None)
    if not collection_uuid:
        click.echo(
            f"ERROR: unrecognized collection {collection}. Pass the name of a VAULT collection with the -c or --collection flag or use the {APP_PREFIX}_COLLECTION env var."
        )
        exit(1)

    root_dir: Path = csvfile.parent.resolve()
    if verbose:
        click.echo(f"Root directory: {root_dir}")

    with csvfile.open("r") as fh:
        reader = csv.DictReader(fh)
        headers: httpx.Headers = httpx.Headers(
            {"X-Authorization": f"access_token={token}"}
        )
        # https://www.python-httpx.org/advanced/clients/
        with httpx.Client(
            base_url="https://vault.cca.edu/api/", headers=headers
        ) as client:
            for index, row in enumerate(reader):
                if verbose:
                    click.echo(f"Processing row no. {index + 1}")
                failure: bool = False

                # map filenames to paths & ensure they 1) exist & 2) are under root_dir (prevent path traversal)
                files: list[Path] = list(
                    map(
                        lambda f: (root_dir / Path(f)).resolve(),
                        row["files"].split("|"),
                    )
                )
                for file in files:
                    if not file.exists():
                        click.echo(
                            f"Error: unable to find file at path {file}", err=True
                        )
                        failure = True
                    if root_dir not in file.parents:
                        click.echo(
                            f"Error: {file} path points outside the root {root_dir} path",
                            err=True,
                        )

                if failure:
                    click.echo(f"Skipping row no. {index + 1} due to errors", err=True)
                    continue

                # construct the XML metadata
                metadata: ET.Element = ET.Element("xml")
                local: ET.Element = ET.SubElement(metadata, "local")
                wrapper: ET.Element = ET.SubElement(local, "courseInfo")
                for field in ["semester", "section_code", "course_title"]:
                    element: ET.Element = ET.SubElement(wrapper, field.split("_")[0])
                    element.text = row[field]
                department: ET.Element = ET.SubElement(wrapper, "department")
                department.text = collection
                mods: ET.Element = ET.SubElement(metadata, "mods")
                name: ET.Element = ET.SubElement(mods, "name")
                name_part: ET.Element = ET.SubElement(name, "namePart")
                name_part.text = row["student"]
                title_info: ET.Element = ET.SubElement(mods, "titleInfo")
                title: ET.Element = ET.SubElement(title_info, "title")
                title.text = " | ".join(
                    [row["semester"], row["section_code"], row["student"]]
                )

                if debug:
                    click.echo(f"Item no. {index + 1} XML:")
                    click.echo(ET.tostring(metadata, encoding="unicode"))
                    click.echo(f"Item no. {index + 1} attachments:")
                    for file in files:
                        click.echo(f"- {file}")

                else:
                    # create file area, add files (in parallel?), create item using filearea
                    # can model after Portal syllabus integration
                    # https://gitlab.com/california-college-of-the-arts/portal/-/blob/main/portal/apps/vault/syllabus.py

                    # Obtain a file area for attachments
                    # ? should we use the /staging API route? /file is deprecated, apparently
                    response: httpx.Response = client.post("file")
                    debug_response(verbose, response)
                    response.raise_for_status()
                    filearea: dict[str, str] = response.json()
                    # Upload files to the file area
                    # ? parallelize?
                    # ? do we need to set content-length and content-type headers?
                    for file in files:
                        upload_headers = headers
                        # TODO use something that actually looks at file contents
                        mt = mimetypes.guess_type(file.name)[0]
                        if mt:
                            upload_headers["Content-Type"] = mt
                        else:
                            click.echo(
                                f"Unable to determine mime type for file {file.name}",
                                err=True,
                            )
                        # httpx automatically adds content-length header
                        response = client.put(
                            f"file/{filearea['uuid']}/content/{file.name}",
                            content=open(file, "rb"),
                            headers=upload_headers,
                        )
                        debug_response(verbose, response)
                        response.raise_for_status()

                    # Create an item using the file area
                    # Probably something to do with the structure of the item dict
                    item: dict[str, Any] = {
                        "attachments": [],
                        "collection": {"uuid": collection_uuid},
                        "metadata": ET.tostring(metadata, encoding="unicode"),
                    }
                    for file in files:
                        item["attachments"].append(
                            {
                                "description": file.name,
                                "filename": file.name,
                                "type": "file",
                                # TODO is this necessary?
                                # special value that'll be replaced by the attachment UUID
                                "uuid": f"uuid:{file.name}",
                            }
                        )
                    # This is necessary or EQUELLA throws an Unsupported Media Type error
                    headers["Content-Type"] = "application/json"
                    url = f"item?file={filearea['uuid']}"
                    if draft:
                        url += "&draft=true"
                    response = client.post(url, json=item, headers=headers)
                    debug_response(verbose, response)
                    response.raise_for_status()
                    # EQUELLA adds the new item's API URL in the Location header
                    click.echo(
                        f"Created item: {response.headers['Location'].replace('/api/item/', '/items/')}"
                    )


if __name__ == "__main__":
    main(auto_envvar_prefix=APP_PREFIX)
