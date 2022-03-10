# VAULT Retention

We remove items from the VAULT digital archive that are older than 6 years old and not deemed to have everlasting institutional value. See the [VAULT retention policy](https://docs.google.com/document/d/1kbWYS_Xa0hXvEU7YCrMLULuTco6RdhKdLY-qWBVky5o/edit#) for policy details.

## Procedures (WIP)

1. Identify items for removal, `node ret.js`
    1. Items must have been contributed at least six years ago
    2. Items must not have markers of significance (awards, "high" rating)
    3. Items must not be in an important collection (Libraries, Syllabus, Accreditation)
2. Reach out to item owners with instructions on downloading their works, `node contact.js` (WIP)
3. Wait six months and then bulk remove the identified items

## Configuration

Create a JSON .retentionrc file (see the included example) with VAULT's root URL, an OAuth token with access to the appropriate permissions, a cutoff date (in "YYYY-MM-DD" format, which can left null to default to six years ago), and an array of collection UUIDs to exclude.

We exclude the Art Collection, Assessment & Accreditation Documents, Exhibitions, Faculty Research, Libraries, Libraries' eResources, Open Access Journal Articles, Press Clips, Syllabus Collection, VAULT Documentation, and Web Assets collections.

For email, we need to authenticate with the Gmail SMTP client. In order to work with two-factor authentication, this means creating an application-specific password. See nodemailer's [instructions for using Gmail](https://nodemailer.com/usage/using-gmail/). We may want to use our [Mailgun](https://app.mailgun.com/) account instead, since we cannot use the vault@cca.edu delegated account otherwise.
