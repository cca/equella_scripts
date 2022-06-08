# VAULT Retention

We remove items from the VAULT digital archive that are older than 6 years old and not deemed to have everlasting institutional value. See the [VAULT retention policy](https://docs.google.com/document/d/1kbWYS_Xa0hXvEU7YCrMLULuTco6RdhKdLY-qWBVky5o/edit#) for policy details.

## Procedures

1. Identify items for removal, `node ret`
    1. Items must have been contributed at least six years ago
    2. Items must not have markers of significance (awards, "high" rating, program portfolios)
    3. Items must not be in an important collection (Libraries, Syllabus, Accreditation)
2. (Optional) Compile summary statistics, `node summarize -f items.json`
3. Break items into reasonably sized sets of emails, `node chunk.js -f items.json`
4. Reach out to item owners with instructions on downloading their works, `node contact -f items-1.json` (see notes below about email configuration)
    1. The script logs to stdout, so realistically we run it like `node contact -f data/items-1.json | tee -a data/log.txt` so we can record the logs
    2. Repeat this step for each "chunk" of items
5. Wait six months and then bulk remove the identified items, `node del -f items.json`

## Configuration

Create a JSON .retentionrc file (see example.retentionrc or code block below) with VAULT's root URL, an OAuth token with access to the appropriate permissions, an optional cutoff date (in "YYYY-MM-DD" format, which can left null to default to six years ago), and an array of collection UUIDs to exclude.

```json
{
    "url": "https://vault.cca.edu",
    "token": "{ UUID token here }",
    "exclude_collections": [
        "9ec74523-e018-4e01-ab4e-be4dd06cdd68", // Syllabus collection
        "6b755832-4070-73d2-77b3-3febcc1f5fad", // Libraries
        "e5269fd8-c50c-4d28-8420-bd7351e573bc", // Assessment & Accreditation
        "7f0ee0e2-bd15-4182-a83a-1b4c69e181f0", // Exhibitions
        "b8852fc5-4423-4bc7-958f-7ea643a0b438", // Art Collection
        "e96ccf65-0098-44bb-bec0-6e1cd5466046", // Faculty Research
        "db4e60c6-e001-9ef3-5ce5-479f384026a3", // Libraries' eResources
        "c34be1f4-c3ea-47d9-b336-e39ad6e926f4", // Open Access Journal Articles
        "c99a7b30-b877-494d-8cd2-7d860793ee92", // Press Clips
        "9bd9dea9-8545-4d73-b151-c108ce38b398", // Web Assets
        "a5ccf44c-de97-4b47-ae31-428216b182d6", // VAULT Documentation
        "a272752b-db5b-4381-9a91-9a0febc1739a", // Dashboard thumbnails
        "905e9e64-2d7c-4922-994c-bb467f52f9b2", // License Agreements
        "5b05c15b-d835-49d4-a061-fdc60c7ab623"  // Lecture Series / Speaker Release
    ],
    // mailgun
    "smtp_user": "postmaster@sandboxf71b89c221c948118ac2542dd1bc019d.mailgun.org",
    "smtp_pass": "{ really long password }",
    "transporter": "mailgun",
    // Google SMTP
    // "smtp_user": "ephetteplace@cca.edu",
    // "smtp_pass": "{ one-time password }",
    // "transporter": "google",
    "verbose": true
}
```

We exclude the collections listed above. See the [Collections Categorized for Migration](https://docs.google.com/spreadsheets/d/1rD3nUSFjLp_0VhKYdTZb1SoUZZbxdScpJ9BXRCWJua0/edit) spreadsheet for more details.

## Email

For email, we need to authenticate an SMTP client. In the config file, use `smtp_user`, `smtp_pass`, and `transporter` settings, where transporter can be either google/gmail or mailgun. If `transporter` is not defined, email JSON is printed to stdout.

Our institutional Gmail accounts require two-factor authentication, so authenticating involves creating an application-specific password. See nodemailer's [instructions for using Gmail](https://nodemailer.com/usage/using-gmail/). Google will block excessive email with a misleading response, `421 4.3.0 Temporary System Problem.  Try again later (10).` (see [example](https://github.com/cca/equella_scripts/issues/11#issuecomment-1149277857)) so we pause two seconds in between each message.

Moodle uses [Mailgun](https://app.mailgun.com/), which provides a free testing domain. Go to Dashboard > Sending domains > SMTP to find the credentials. Note that we have to add the recipient's email address to our "Authorized Recipients" to use the testing domain. There's also a [nodemailer-mailgun-transport](https://www.npmjs.com/package/nodemailer-mailgun-transport) package if using the Mailgun REST API seems better than SMTP for some reason.

Many users' emails will "bounce back" as invalid addresses because they've been deleted for one reason or another. Included in this project is an "email-bouncebacks.js" [Google Apps Script](https://script.google.com) which programmatically logs those missing addresses and archives the email threads. To use it:

- Create a new Apps Script project
- Paste the code in & save it
- Open the **Execution log**
- **Run** the code
  - The first time the script runs, it will ask for permission to connect to Gmail
- Copy the logs & save them somewhere (e.g. data/email-bounces.log)
