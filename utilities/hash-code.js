#!/usr/bin/env node
import {pathToFileURL} from 'node:url'
// useful for finding location of files on server, location is
// {{data dir}}/Institutions/cca2012/Attachments/${hashCode(uuid)}/${uuid}/${version}
function hashCode (str){
    let hash = 0
    if (str.length == 0) return hash
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i)
        hash = ((hash<<5)-hash)+char
        hash = hash & hash // Convert to 32bit integer
    }
    return hash & 127
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const uuid = process.argv[2]
    console.log(hashCode(uuid))
}
