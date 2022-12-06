#!/usr/bin/env node
/**
 * Generates an EQUELLA Power Search URL & copies to Mac clipboard
 *
 * Fill in appropriate pieces (xml, el, id) then run like:
 * > ./copySearchURL.js
 * There's no output; the URL is copied to your clipboard.
 */
import { spawn } from 'child_process'
let stem = 'https://vault.cca.edu/access/searching.do?doc='
    , xmltpl
    , el
    , id
    , params = 'q=&sort=datemodified&dr=AFTER'
    , url
    , pbcopy = spawn('pbcopy');

/**
 * XML search document w/ "REPLACE" in the middle, e.g.
    <xml>
        <local>
            <courseInfo>
                REPLACE
            </courseInfo>
        </local>
    </xml>
 */
xmltpl = "<xml><mods><origininfo><dateCreatedWrapper>REPLACE</dateCreatedWrapper></origininfo></mods></xml>"
// the Freemarker variable that'll be filled in the middle of the XML
// we assume its template var & XML element are named identically
// e.g. <course>${course}</course>
el = 'dateCreated'
// ID of Power Search, first letter will be "P"
id = 'Pc121f09c-8ea9-4bc9-90bf-8467c37a4ec4'

url = stem + encodeURIComponent(xmltpl).replace('REPLACE', `%3C${el}%3E$\{${el}}%3C%2F${el}%3E`) + `&in=${id}&${params}`

pbcopy.stdin.write(url)
pbcopy.stdin.end()
