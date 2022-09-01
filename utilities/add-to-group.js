#!/usr/bin/env node
const request = require('request')
const fs = require('fs')
const async = require('async')

let cli_defaults = { add: true }
let options = require('rc')('equella', cli_defaults)

if (options.help || options.h) {
    console.log('usage: node add-to-group --group 1234 --users [ users.json | user1,user2 ] [ --add | --replace | --clear ]')

    console.log('\n\tadd users from a JSON array file to an internal VAULT group')
    console.log('\tor supply a comma-separated list of usernames')

    console.log('\n\tYou can find a group\'s UUID in the VAULT admin console or with equella-cli')
    console.log('\te.g. try running "eq group --name $GROUP_NAME" & finding the ID in the result.')

    console.log('\nOptions:\n\t--add: add users while keeping current ones (default behavior)')
    console.log('\t--replace, --clear: replace current group with contents of users file')
    process.exit(0)
}

let headers = {
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + options.token,
}
let url = `https://vault.cca.edu/api/usermanagement/local/group/${options.group}`
let req_options = { headers: headers, json: true, url: url }
let req = request.defaults(req_options)

if (!options.group) {
    console.error('Must provide a group UUID either with --group parameter or in an .equellarc file.')
    process.exit(1)
}

// hold full group API JSON, array of users
let group = {}
let users = []

function getGroup (callback) {
    req.get({}, (err, resp) => {
        if (err) return callback(err)

        group = resp.body
        // EQUELLA API errors return an object like this
        if (group.error) throw Error(`${group.code} ${group.error}: ${group.error_description}`)

        if (options.debug) console.log('group: ', group)
        return callback()
    })
}

function getUsers(callback) {
    if (options.users.match(/\.json$/)) {
        // users.json file
        fs.readFile(options.users, (err, buffer) => {
            if (err) return callback(err)
            users = JSON.parse(buffer.toString())
            if (options.debug) console.log('users: ', users)
            return callback()
        })
    } else {
        // comma-separated string 'user1,user2'
        users = options.users.split(',')
        return callback()
    }
}

function updateGroup(err, results) {
    if (err) throw err

    if (options.clear || options.replace) group.users = users

    if (options.add) {
        users.forEach(user => {
            if (!group.users.includes(user)) group.users.push(user)
        })
    }

    if (options.debug) console.log('new group: ', group)
    req.put({json: group}, (err, resp) => {
        if (err) {
            throw err
        } else {
            console.log(resp.statusCode, 'successful')
            process.exit(0)
        }
    })
}

// flow: get group data, get users from file, combine & PUT data back to VAULT
async.parallel([getGroup, getUsers], updateGroup)
