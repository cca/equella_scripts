const nodemailer = require('nodemailer')
const options = require('rc')('retention')

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: options.smtp_user,
        pass: options.smtp_pass
    }
})

let msg = {
    from: "vault@cca.edu",
    to: "ephetteplace@cca.edu",
    subject: "VAULT Retention Test",
    html: `<p>Hello Eric</p><br><p>Check out <a href="https://example.com">this link</a>.`
}

transporter.sendMail(msg, (err, info) => {
    if (err) console.error(err)
    console.log(info)
})
