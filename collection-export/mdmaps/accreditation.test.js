import assert from 'node:assert'
import {describe, it} from 'mocha'
import xpath from 'xpath'
import {convertAccreditationXMLtoMODS} from './accreditation.js'

// helper function to wrap XML in a root <xml> element
const x = (xml) => `<xml>${xml}</xml>`

describe('convertAccreditationXMLtoMODS', () => {
    // we do not need to test invalid input, this is tested in multiple other places
    describe('MODS setup', () => {
        it('should include the MODS namespace & attributes', () => {
            const result = convertAccreditationXMLtoMODS(x('<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods>'))
            assert.strictEqual(result.documentElement.nodeName, 'mods')
            assert.strictEqual(result.documentElement.getAttribute('xmlns'), 'http://www.loc.gov/mods/v3')
            assert.strictEqual(result.documentElement.getAttribute('version'), '3.8')
        })

        it('should make <mods> the new root element & drop the /local branch', () => {
            const input = x('<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods><local><foo>bar</foo></local>')
            const result = convertAccreditationXMLtoMODS(input)
            assert.strictEqual(result.documentElement.nodeName, 'mods')
            assert.strictEqual(xpath.select1('//local', result), undefined)
        })
    })

    describe('typeOfResource', () => {
        it('should add typeOfResource = text', () => {
            const input = x('<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods>')
            const result = convertAccreditationXMLtoMODS(input)
            const typeOfResource = xpath.select1('//mods/typeOfResource', result)
            assert.ok(typeOfResource)
            assert.strictEqual(typeOfResource.textContent, 'text')
        })
    })

    describe('genreWrapper unwrapping', () => {
        it('should unwrap mods/genreWrapper/genre to mods/genre', () => {
            const input = x(`<mods>
                <physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription>
                <genreWrapper><genre>Report</genre></genreWrapper>
            </mods>`)
            const result = convertAccreditationXMLtoMODS(input)
            const genre = xpath.select1('//mods/genre', result)
            assert.ok(genre)
            assert.strictEqual(genre.textContent, 'Report')
            assert.strictEqual(xpath.select1('//mods/genreWrapper', result), undefined)
        })
    })

    describe('document category subject mapping', () => {
        it('should map Assessment formSpecific to a subject/topic w/ lcsh authority', () => {
            const input = x('<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods>')
            const result = convertAccreditationXMLtoMODS(input)
            const topic = xpath.select1('//mods/subject/topic', result)
            assert.ok(topic)
            assert.strictEqual(topic.textContent, 'Assessment')
            assert.strictEqual(topic.getAttribute('authority'), 'lcsh')
            assert.strictEqual(topic.getAttribute('authorityURI'), 'http://id.loc.gov/authorities/subjects')
            assert.strictEqual(topic.getAttribute('valueURI'), 'http://id.loc.gov/authorities/subjects/sh85045926')
        })

        it('should map Accreditation formSpecific to a subject/topic w/ lcsh authority', () => {
            const input = x('<mods><physicalDescription><formSpecific>Accreditation</formSpecific></physicalDescription></mods>')
            const result = convertAccreditationXMLtoMODS(input)
            const topic = xpath.select1('//mods/subject/topic', result)
            assert.ok(topic)
            assert.strictEqual(topic.textContent, 'Accreditation (Education)')
            assert.strictEqual(topic.getAttribute('valueURI'), 'http://id.loc.gov/authorities/subjects/sh85000437')
        })

        it('should remove the physicalDescription element', () => {
            const input = x('<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods>')
            const result = convertAccreditationXMLtoMODS(input)
            assert.strictEqual(xpath.select1('//mods/physicalDescription', result), undefined)
        })
    })

    describe('subject/name accreditation orgs', () => {
        it('should move subject/name text into subject/name/namePart & add type=corporate', () => {
            const org = 'WASC Senior College and University Commission'
            const input = x(`<mods>
                <physicalDescription><formSpecific>Accreditation</formSpecific></physicalDescription>
                <subject><name>${org}</name></subject>
            </mods>`)
            const result = convertAccreditationXMLtoMODS(input)
            const name = xpath.select1(`//mods/subject/name[namePart="${org}"]`, result)
            assert.ok(name)
            assert.strictEqual(name.getAttribute('type'), 'corporate')
        })

        it('should not modify subject/name elements without direct text content', () => {
            const input = x(`<mods>
                <physicalDescription><formSpecific>Accreditation</formSpecific></physicalDescription>
                <subject><name><namePart>Already Set</namePart></name></subject>
            </mods>`)
            const result = convertAccreditationXMLtoMODS(input)
            const name = xpath.select1('//mods/subject/name', result)
            assert.ok(name)
            assert.strictEqual(name.getAttribute('type'), null)
            assert.strictEqual(xpath.select('namePart', name).length, 1)
        })
    })

    describe('local/department to subject/name', () => {
        it('should add a subject/name@type=corporate/namePart for each local/department', () => {
            const department = 'Office of Institutional Research'
            const input = x(`<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods><local><department>${department}</department></local>`)
            const result = convertAccreditationXMLtoMODS(input)
            const name = xpath.select1(`//mods/subject/name[namePart="${department}"]`, result)
            assert.ok(name)
            assert.strictEqual(name.getAttribute('type'), 'corporate')
        })

        it('should handle multiple local/department elements', () => {
            const dept1 = 'Office of Institutional Research'
            const dept2 = 'Office of Academic Affairs'
            const input = x(`<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods><local><department>${dept1}</department><department>${dept2}</department></local>`)
            const result = convertAccreditationXMLtoMODS(input)
            const name1 = xpath.select1(`//mods/subject/name[namePart="${dept1}"]`, result)
            const name2 = xpath.select1(`//mods/subject/name[namePart="${dept2}"]`, result)
            assert.ok(name1)
            assert.ok(name2)
        })

        it('should not add a subject/name for empty local/department elements', () => {
            const input = x('<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription></mods><local><department></department></local>')
            const result = convertAccreditationXMLtoMODS(input)
            assert.strictEqual(xpath.select1('//mods/subject/name', result), undefined)
        })
    })

    describe('archives series', () => {
        // the four academic divisions live under the Administrative part of the
        // "CCA Departments & Programs" taxonomy but are deliberately treated as academic
        const DIVISIONS = [
            'Architecture Division',
            'Design Division',
            'Fine Arts Division',
            'Humanities and Sciences Division',
        ]

        // build an item with a given formSpecific category & optional local/department elements
        const item = (formSpecific, ...departments) => x(
            `<mods><physicalDescription><formSpecific>${formSpecific}</formSpecific></physicalDescription></mods>`
            + (departments.length ? `<local>${departments.map(d => `<department>${d}</department>`).join('')}</local>` : ''),
        )

        // assert the nested series structure: subseries is the outer relatedItem, series is nested inside
        const assertSeries = (result, series, subseries) => {
            const outer = xpath.select1("//mods/relatedItem[@type='series' and @displayLabel='subseries']", result)
            assert.ok(outer, 'expected a subseries relatedItem')
            assert.strictEqual(xpath.select('string(titleInfo/title)', outer), subseries)
            const inner = xpath.select1("relatedItem[@type='series' and @displayLabel='series']", outer)
            assert.ok(inner, 'expected a nested series relatedItem')
            assert.strictEqual(xpath.select('string(titleInfo/title)', inner), series)
        }

        it('should add an archives series to every item regardless of doc type', () => {
            for (const formSpecific of ['Assessment', 'Accreditation']) {
                const result = convertAccreditationXMLtoMODS(item(formSpecific))
                assert.ok(
                    xpath.select1("//mods/relatedItem[@type='series']", result),
                    `expected an archives series for a ${formSpecific} document`,
                )
            }
        })

        describe('Accreditation documents', () => {
            it('should add I. Administrative Materials > 2. Accreditation and Licensing Materials', () => {
                const result = convertAccreditationXMLtoMODS(item('Accreditation'))
                assertSeries(result, 'I. Administrative Materials', '2. Accreditation and Licensing Materials')
            })

            it('should use the same series for an administrative department', () => {
                const result = convertAccreditationXMLtoMODS(item('Accreditation', 'Libraries'))
                assertSeries(result, 'I. Administrative Materials', '2. Accreditation and Licensing Materials')
            })

            it('should use the same series for an academic department', () => {
                const result = convertAccreditationXMLtoMODS(item('Accreditation', 'Comics (MFA)'))
                assertSeries(result, 'I. Administrative Materials', '2. Accreditation and Licensing Materials')
            })
        })

        describe('Assessment documents', () => {
            it('should add IV. Department Materials > 2. Administrative Departments for an admin department', () => {
                const result = convertAccreditationXMLtoMODS(item('Assessment', 'Libraries'))
                assertSeries(result, 'IV. Department Materials', '2. Administrative Departments')
            })

            it('should add IV. Department Materials > 1. Academic Departments for an academic department', () => {
                const result = convertAccreditationXMLtoMODS(item('Assessment', 'Comics (MFA)'))
                assertSeries(result, 'IV. Department Materials', '1. Academic Departments')
            })

            it('should default to 1. Academic Departments when there is no department', () => {
                const result = convertAccreditationXMLtoMODS(item('Assessment'))
                assertSeries(result, 'IV. Department Materials', '1. Academic Departments')
            })

            it('should default to 1. Academic Departments when the department is empty', () => {
                const result = convertAccreditationXMLtoMODS(item('Assessment', '   '))
                assertSeries(result, 'IV. Department Materials', '1. Academic Departments')
            })

            it('should use 2. Administrative Departments if any one department is administrative', () => {
                const result = convertAccreditationXMLtoMODS(item('Assessment', 'Comics (MFA)', 'Academic Affairs'))
                assertSeries(result, 'IV. Department Materials', '2. Administrative Departments')
            })
        })

        describe('academic divisions', () => {
            // divisions sit under Administrative in the taxonomy but are considered academic
            for (const division of DIVISIONS) {
                it(`should treat ${division} as an academic department`, () => {
                    const result = convertAccreditationXMLtoMODS(item('Assessment', division))
                    assertSeries(result, 'IV. Department Materials', '1. Academic Departments')
                })
            }

            it('should treat a division as academic even alongside another academic department', () => {
                const result = convertAccreditationXMLtoMODS(item('Assessment', 'Fine Arts Division', 'Design Division'))
                assertSeries(result, 'IV. Department Materials', '1. Academic Departments')
            })

            it('should still use 2. Administrative Departments for a division plus a true admin department', () => {
                const result = convertAccreditationXMLtoMODS(item('Assessment', 'Fine Arts Division', 'Academic Affairs'))
                assertSeries(result, 'IV. Department Materials', '2. Administrative Departments')
            })
        })

        it('should add only one archives series per item', () => {
            const result = convertAccreditationXMLtoMODS(item('Assessment', 'Fine Arts Division', 'Design Division', 'Academic Affairs'))
            const outerSeries = xpath.select("//mods/relatedItem[@type='series' and @displayLabel='subseries']", result)
            assert.strictEqual(outerSeries.length, 1)
        })
    })

    describe('dateCreated unwrapping', () => {
        it('should unwrap origininfo/dateCreatedWrapper/dateCreated to originInfo/dateCreated w/ edtf encoding', () => {
            const input = x(`<mods>
                <physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription>
                <origininfo><dateCreatedWrapper><dateCreated>2021</dateCreated></dateCreatedWrapper></origininfo>
            </mods>`)
            const result = convertAccreditationXMLtoMODS(input)
            const originInfo = xpath.select1('//mods/originInfo', result)
            assert.ok(originInfo)
            const dateCreated = xpath.select1('dateCreated', originInfo)
            assert.ok(dateCreated)
            assert.strictEqual(dateCreated.textContent, '2021')
            assert.strictEqual(dateCreated.getAttribute('encoding'), 'edtf')
        })

        it('should rename semesterCreated to dateCreated without an encoding attribute', () => {
            const input = x(`<mods>
                <physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription>
                <origininfo><semesterCreated>Fall 2021</semesterCreated></origininfo>
            </mods>`)
            const result = convertAccreditationXMLtoMODS(input)
            const originInfo = xpath.select1('//mods/originInfo', result)
            assert.ok(originInfo)
            const dateCreated = xpath.select1('dateCreated', originInfo)
            assert.ok(dateCreated)
            assert.strictEqual(dateCreated.textContent, 'Fall 2021')
            assert.strictEqual(dateCreated.getAttribute('encoding'), null)
        })
    })

    describe('part/number conversion', () => {
        it('should convert a single mods/part/number to part/text @type=attachment-uuid', () => {
            const input = x(`<mods>
                <physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription>
                <part><number>abc-123</number></part>
            </mods>`)
            const result = convertAccreditationXMLtoMODS(input)
            const text = xpath.select1('//mods/part/text', result)
            assert.ok(text)
            assert.strictEqual(text.getAttribute('type'), 'attachment-uuid')
            assert.strictEqual(text.textContent, 'abc-123')
            assert.strictEqual(xpath.select1('//mods/part/number', result), undefined)
        })
    })

    describe('empty element removal', () => {
        it('should remove empty elements after conversion', () => {
            const input = x('<mods><physicalDescription><formSpecific>Assessment</formSpecific></physicalDescription><note></note><abstract>   </abstract></mods>')
            const result = convertAccreditationXMLtoMODS(input)
            assert.strictEqual(xpath.select1('//mods/note', result), undefined)
            assert.strictEqual(xpath.select1('//mods/abstract', result), undefined)
        })
    })

    describe('full conversion', () => {
        it('should apply all conversions together for a representative item', () => {
            const org = 'Accrediting Commission'
            const department = 'Office of Institutional Research'
            const input = x(`<mods>
                <physicalDescription><formSpecific>Accreditation</formSpecific></physicalDescription>
                <genreWrapper><genre>Report</genre></genreWrapper>
                <subject><name>${org}</name></subject>
                <origininfo><dateCreatedWrapper><dateCreated>2021</dateCreated></dateCreatedWrapper></origininfo>
                <part><number>uuid-only</number></part>
            </mods><local><department>${department}</department></local>`)
            const result = convertAccreditationXMLtoMODS(input)

            assert.strictEqual(result.documentElement.nodeName, 'mods')
            assert.strictEqual(xpath.select1('//mods/typeOfResource', result).textContent, 'text')
            assert.strictEqual(xpath.select1('//mods/genre', result).textContent, 'Report')

            const topic = xpath.select1('//mods/subject/topic', result)
            assert.strictEqual(topic.textContent, 'Accreditation (Education)')

            const orgName = xpath.select1(`//mods/subject/name[namePart="${org}"]`, result)
            assert.ok(orgName)
            assert.strictEqual(orgName.getAttribute('type'), 'corporate')

            const deptName = xpath.select1(`//mods/subject/name[namePart="${department}"]`, result)
            assert.ok(deptName)

            const dateCreated = xpath.select1('//mods/originInfo/dateCreated', result)
            assert.strictEqual(dateCreated.textContent, '2021')
            assert.strictEqual(dateCreated.getAttribute('encoding'), 'edtf')

            const text = xpath.select1('//mods/part/text', result)
            assert.strictEqual(text.getAttribute('type'), 'attachment-uuid')
            assert.strictEqual(text.textContent, 'uuid-only')

            assert.strictEqual(xpath.select1('//local', result), undefined)
        })

        it('should throw an error for non-string input', () => {
            assert.throws(() => convertAccreditationXMLtoMODS(null), /XML input must be a string/)
            assert.throws(() => convertAccreditationXMLtoMODS(123), /XML input must be a string/)
            assert.throws(() => convertAccreditationXMLtoMODS({}), /XML input must be a string/)
        })
    })
})
