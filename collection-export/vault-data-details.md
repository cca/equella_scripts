# VAULT Data Details

This document describes the structure of content in VAULT, CCA's Digital Archive. VAULT uses [openEQUELLA](https://openequella.github.io/) repository software.

## Collection Export Tool

Exported files were created with the [Collection Export](https://github.com/cca/equella_scripts/tree/main/collection-export) tool in the `equella_scripts` repository. The export tool relies on [openEQUELLA's REST APIs](https://openequella.github.io/guides/RestAPIGuide.html).

## File Structure

There is one directory/prefix per item named `$UUID-$VERSION` where `$UUID` is the unique identifier for the item and `$VERSION` is its integer version number. We typically do not export multiple versions of the same item, as older versions contain outdated metadata.

In the root of the item directory are the attachment files, which can be any format (image, audio, document, video, etc.), and a "metadata" subdirectory. The "metadata" subdirectory contains three files:

The **item.json** file is the raw `GET /item/$UUID/$VERSION` API response from openEQUELLA. It is a single JSON object. It contains additional technical, structural, and administrative metadata beyond what is in the XML metadata, such as information about attachments (e.g., file size and md5 checksum) and creation (e.g., owner, creation date, modification date).

The **metadata.xml** file is only the item metadata (`.metadata` within the JSON object).

The **metadata.mods.xml** file is the item metadata in MODS format (using the [strict-mods.js](https://github.com/cca/equella_scripts/blob/main/collection-export/strict-mods.js) conversion of Collection Export). This file should validate against [MODS schema version 3.8](https://www.loc.gov/standards/mods/mods-3-8.xsd) (2022).

## Controlled Vocabularies

We use several controlled vocabularies. Our metadata references these by acronyms in `@authority` attributes, but we do not have `authorityURI` or `valueURI` attributes for them. See the CCA Controlled Vocabularies spreadsheet for details.

## Note

After updating this document, copy it into place like `aws s3 cp vault-data-details.md s3://$BUCKET/vault/readme.md` where `$BUCKET` is the name of the archival S3 bucket.
