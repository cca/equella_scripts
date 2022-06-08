// find emails in my inbox that are bouncebacks from the Google mail system
// the message body looks like:
// "Address not found
// Your message wasn't delivered to ADDRESS@cca.edu because the address couldn't be found, or is unable to receive mail.""
// Apps Script editor auto-indents to 2 spaces, not eslint's default 4
/* eslint indent: [warn,2] */
function getBouncebackEmails() {
  console.log(`${new Date().toISOString()} - scanning ephetteplace@cca.edu inbox for bounceback messages`)
  var threads = GmailApp.getInboxThreads()
  // iterate over inbox threads and then over the messages inside them
  // https://developers.google.com/apps-script/reference/gmail/gmail-app
  threads.forEach(thread => {
    var messages = thread.getMessages()
    messages.filter(m => m.getFrom().match('mailer-daemon@googlemail.com')).forEach(m => {
      var matches = m.getBody().match(/<b>(.*@cca\.edu)<\/b>/)
      if (matches) {
        return console.log(`Email bounceback for address ${matches[1]}`)
      } else {
        console.log('Unable to find CCA email address in message.')
      }
    })
    // mark as read & archive the thread
    thread.markRead() && thread.moveToArchive()
  })
}
