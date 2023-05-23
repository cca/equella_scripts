// convert EQUELLA taxonomy to Invenio vocabulary
// https://inveniordm.docs.cern.ch/customize/vocabularies/
// NOTE: only works with flat taxonomies, Invenio vocabs are all flat so they cannot
// represent something hierarchical like VAULT's course list taxonomies
import { default as fetch, Headers } from 'node-fetch'
import rc from 'rc'
import YAML from 'yaml'

const opts = rc('equella')
const taxo_uuid = opts._[0]

if (!taxo_uuid) {
    console.error('Error: you must pass a taxonomy UUID as a positional argument to this script')
    process.exit(1)
}

const headers = new Headers({
    'Accept': 'application/json',
    'X-Authorization': 'access_token=' + opts.token,
})
const fetch_opts = { headers: headers }
const url = `${opts.root}/api/taxonomy/${taxo_uuid}/term`

function equellaError(obj) {
    if (obj.error) throw Error(`${obj.code} ${obj.error}: ${obj.error_description}`)
}

async function getTaxoTerms() {
    const response = await fetch(url, fetch_opts)
    const data = await response.json()
    equellaError(data)
    return data
}

function termToYaml(term) {
    // subject vocabs look like https://inveniordm.docs.cern.ch/customize/vocabularies/subjects/
    // { id, scheme, subject }
    // while all others look like https://inveniordm.docs.cern.ch/customize/vocabularies/
    // { id, props, title: { en } }
    // where props is usually irrelevant & title.en is the English text of the term
    // (Q: why are subjects not internationalized?!?)
    if (opts.type === 'subject') {
        return { id: term.fullTerm, subject: term.term }
    } else {
        return { id: term.fullTerm, title : { en: term.term } }
    }
}

async function main() {
    const terms = await getTaxoTerms()
    const yaml = YAML.stringify(terms.map(termToYaml))
    console.log(yaml)
}

main()
