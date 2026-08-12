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

## REST API Item JSON Structure

See the included "VAULT Item JSON Data Dictionary" spreadsheet for information on these fields. In the data dictionary, the "Nullable" column indicates whether a field can be nonexistent (e.g., the `filename` on a `type = url` attachment) for particular items or attachments. Most nullable fields are properties of attachments due to the different types, which are enumerated in the data dictionary.

Example:

```json
{
  "uuid": "5ba9b49e-6ba6-4854-a72e-d2e4a2b67380",
  "version": 2,
  "name": "Artists books / Brooklyn Museum of Art",
  "metadata": "<xml><mods>...</mods></xml>",
  "status": "live",
  "createdDate": "2025-10-27T11:31:16.257-07:00",
  "modifiedDate": "2025-10-27T11:31:16.257-07:00",
  "owner": {
    "id": "pnavarrete"
  },
  "collaborators": [],
  "collection": {
    "uuid": "db4e60c6-e001-9ef3-5ce5-479f384026a3"
  },
  "rating": -1,
  "attachments": [
    {
      "type": "file",
      "uuid": "6e8a5f5d-a3ea-402a-a564-ad3097c2e452",
      "description": "N7433.35.N7_B23_2000_01.TIF",
      "preview": false,
      "erroredIndexing": false,
      "restricted": false,
      "thumbnail": "_THUMBS/N7433.35.N7_B23_2000_01.TIF.jpeg",
      "filename": "N7433.35.N7_B23_2000_01.TIF",
      "size": 6928522,
      "md5": "c75c13696acd3a905588bc5a589a406e",
      "conversion": false,
      "thumbFilename": "_THUMBS/N7433.35.N7_B23_2000_01.TIF.jpeg",
      "externalId": {
        "present": false
      },
      "links": {
        "view": "https://vault.cca.edu/items/5ba9b49e-6ba6-4854-a72e-d2e4a2b67380/2/?attachment.uuid=6e8a5f5d-a3ea-402a-a564-ad3097c2e452",
        "thumbnail": "https://vault.cca.edu/thumbs/5ba9b49e-6ba6-4854-a72e-d2e4a2b67380/2/6e8a5f5d-a3ea-402a-a564-ad3097c2e452"
      }
    }
  ],
  "navigation": {
    "hideUnreferencedAttachments": false,
    "showSplitOption": false,
    "nodes": []
  },
  "drm": {},
  "thumbnail": "default",
  "displayFields": [
    {
      "type": "node",
      "name": "Form",
      "html": "artists' books (books)"
    }
  ],
  "displayOptions": {
    "attachmentType": "STRUCTURED",
    "disableThumbnail": false,
    "standardOpen": false,
    "integrationOpen": false
  },
  "links": {
    "view": "https://vault.cca.edu/items/5ba9b49e-6ba6-4854-a72e-d2e4a2b67380/2/",
    "self": "https://vault.cca.edu/api/item/5ba9b49e-6ba6-4854-a72e-d2e4a2b67380/2/"
  }
}
```

Many fields are administrative metadata and will be unimportant in other systems, such as `rating`, `displayOptions`, and `navigation`. The most important information, sometimes not represented in the XML metadata, is the `uuid`, `version`, `status`, `createdDate`, `modifiedDate`, and some `attachments` subfields (such as `type`, `filename`, `size`, and `md5`).

## Controlled Vocabularies

We use several controlled vocabularies. Our metadata references these by acronyms in `@authority` attributes, but we do not have `authorityURI` or `valueURI` attributes for them. See the CCA Controlled Vocabularies spreadsheet for details.

## Note

After updating this document, copy it into place like `aws s3 cp vault-data-details.md s3://$BUCKET/vault/readme.md` where `$BUCKET` is the name of the archival S3 bucket.
