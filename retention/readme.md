# VAULT Retention

We remove items from the VAULT digital archive that are older than 6 years old and not deemed to have everlasting institutional value. See the [VAULT retention policy](https://docs.google.com/document/d/1kbWYS_Xa0hXvEU7YCrMLULuTco6RdhKdLY-qWBVky5o/edit#) for policy details.

## Procedures (WIP)

1. Identify items for removal, `node ret`
    1. Items must have been contributed at least six years ago
    2. Items must not have markers of significance (awards, "high" rating)
    3. Items must not be in an important collection (Libraries, Syllabus, Accreditation)
2. Reach out to item owners with instructions on downloading their works, `node contact -f items.json` (see notes below about email configuration)
3. Wait six months and then bulk remove the identified items, `node del -f items.json`

## Configuration

Create a JSON .retentionrc file (see the included example) with VAULT's root URL, an OAuth token with access to the appropriate permissions, a cutoff date (in "YYYY-MM-DD" format, which can left null to default to six years ago), and an array of collection UUIDs to exclude.

We exclude the Art Collection, Assessment & Accreditation Documents, Dashboard thumbnail images, Exhibitions, Faculty Research, Libraries, Libraries' eResources, License Agreements, Open Access Journal Articles, Press Clips, Syllabus Collection, VAULT Documentation, and Web Assets collections.

For email, we need to authenticate an SMTP client. In the config file, use `smtp_user`, `smtp_pass`, and `transporter` settings, where transporter can be either google/gmail or mailgun. If `transporter` is not defined, email JSON is printed to stdout.

Our institutional Gmail accounts require two-factor authentication, so authenticating involves creating an application-specific password. See nodemailer's [instructions for using Gmail](https://nodemailer.com/usage/using-gmail/). Moodle uses [Mailgun](https://app.mailgun.com/), which provides a free testing domain. Go to Dashboard > Sending domains > SMTP to find the credentials. Note that we have to add the recipient's email address to our "Authorized Recipients" to use the testing domain.

There's also a [nodemailer-mailgun-transport](https://www.npmjs.com/package/nodemailer-mailgun-transport) package if using the Mailgun REST API seems better than SMTP for some reason.
