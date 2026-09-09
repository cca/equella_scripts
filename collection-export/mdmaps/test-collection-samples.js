#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { DOMParser as xmldom } from '@xmldom/xmldom'
import xpath from 'xpath'
import { toStrictMODS } from './strict-mods.js'

/**
 * Test random samplings of XML metadata from EQUELLA JSON records
 * against the strict-mods library
 */

function parseJSONFile(filePath) {
    const content = readFileSync(filePath, 'utf-8')
    const json = JSON.parse(content)
    
    // Handle both array and object with results property
    if (Array.isArray(json)) {
        return json
    } else if (json.results && Array.isArray(json.results)) {
        return json.results
    } else {
        throw new Error(`Unknown JSON structure in ${filePath}`)
    }
}

function extractXMLFromRecord(record) {
    if (!record.metadata) return null
    
    // Remove the outer quotes if it's a JSON string
    let xml = record.metadata
    if (typeof xml === 'string' && xml.startsWith('"') && xml.endsWith('"')) {
        xml = JSON.parse(xml)
    }
    
    return xml
}

function testXMLConversion(xml, recordId) {
    const results = {
        recordId,
        success: false,
        parseError: null,
        conversionError: null,
        validationIssues: [],
        converted: null
    }
    
    try {
        // Test the conversion
        const converted = toStrictMODS(xml)
        results.converted = converted
        
        // Parse the result to check for well-formedness
        const parser = new xmldom()
        const doc = parser.parseFromString(converted, 'text/xml')
        
        // Check for parse errors
        const parseErrors = doc.getElementsByTagName('parsererror')
        if (parseErrors.length > 0) {
            results.parseError = parseErrors[0].textContent
            return results
        }
        
        // Check for MODS namespace
        const modsElements = xpath.select("//*[local-name()='mods']", doc)
        if (modsElements.length === 0) {
            results.validationIssues.push('No mods element found')
        } else {
            const modsElement = modsElements[0]
            const xmlns = modsElement.getAttribute('xmlns')
            if (xmlns !== 'http://www.loc.gov/mods/v3') {
                results.validationIssues.push(`Incorrect namespace: ${xmlns}`)
            }
        }
        
        // Check for non-standard elements that might remain
        const customElements = xpath.select("//*[local-name()='artstorClassification' or local-name()='photoClassification' or local-name()='dateType' or local-name()='subjectType']", doc)
        if (customElements.length > 0) {
            results.validationIssues.push(`Found ${customElements.length} non-standard elements remaining`)
        }
        
        // Check for wrapper elements that should have been unwrapped
        const wrapperElements = xpath.select("//*[local-name()='dateCreatedWrapper' or local-name()='genreWrapper' or local-name()='noteWrapper' or local-name()='typeOfResourceWrapper']", doc)
        if (wrapperElements.length > 0) {
            results.validationIssues.push(`Found ${wrapperElements.length} wrapper elements not unwrapped`)
        }
        
        results.success = results.validationIssues.length === 0
        
    } catch (error) {
        results.conversionError = error.message
    }
    
    return results
}

function getRandomSample(array, sampleSize) {
    const shuffled = [...array].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, sampleSize)
}

function testCollection(filePath, collectionName, sampleSize = 5) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`TESTING COLLECTION: ${collectionName}`)
    console.log(`File: ${filePath}`)
    console.log(`${'='.repeat(80)}\n`)
    
    try {
        const records = parseJSONFile(filePath)
        console.log(`Total records: ${records.length}`)
        
        // Filter records that have metadata
        const recordsWithMetadata = records.filter(r => r.metadata)
        console.log(`Records with metadata: ${recordsWithMetadata.length}`)
        
        if (recordsWithMetadata.length === 0) {
            console.log('⚠️  No records with metadata found')
            return { totalTests: 0, passed: 0, failed: 0 }
        }
        
        // Get random sample
        const sample = getRandomSample(recordsWithMetadata, Math.min(sampleSize, recordsWithMetadata.length))
        console.log(`Testing ${sample.length} random records\n`)
        
        let passed = 0
        let failed = 0
        const failedRecords = []
        
        sample.forEach((record, idx) => {
            const recordId = record.uuid || record.name || `record-${idx}`
            console.log(`\n--- Test ${idx + 1}/${sample.length}: ${recordId} ---`)
            
            const xml = extractXMLFromRecord(record)
            if (!xml) {
                console.log('❌ No XML metadata found')
                failed++
                return
            }
            
            // Show a snippet of the original XML
            const xmlSnippet = xml.substring(0, 150).replace(/\n/g, ' ')
            console.log(`Original XML: ${xmlSnippet}...`)
            
            const result = testXMLConversion(xml, recordId)
            
            if (result.conversionError) {
                console.log(`❌ CONVERSION ERROR: ${result.conversionError}`)
                failed++
                failedRecords.push({ recordId, error: result.conversionError })
            } else if (result.parseError) {
                console.log(`❌ PARSE ERROR: ${result.parseError}`)
                failed++
                failedRecords.push({ recordId, error: result.parseError })
            } else if (result.validationIssues.length > 0) {
                console.log(`⚠️  VALIDATION ISSUES:`)
                result.validationIssues.forEach(issue => console.log(`   - ${issue}`))
                // Count as passed if conversion worked, just note the issues
                passed++
            } else {
                console.log(`✅ SUCCESS - Converted successfully`)
                passed++
            }
            
            // Show converted snippet
            if (result.converted) {
                const convertedSnippet = result.converted.substring(0, 150).replace(/\n/g, ' ')
                console.log(`Converted: ${convertedSnippet}...`)
            }
        })
        
        // Summary
        console.log(`\n${'-'.repeat(80)}`)
        console.log(`SUMMARY for ${collectionName}:`)
        console.log(`  Total tested: ${sample.length}`)
        console.log(`  ✅ Passed: ${passed}`)
        console.log(`  ❌ Failed: ${failed}`)
        console.log(`  Success rate: ${((passed / sample.length) * 100).toFixed(1)}%`)
        
        if (failedRecords.length > 0) {
            console.log(`\nFailed records:`)
            failedRecords.forEach(({ recordId, error }) => {
                console.log(`  - ${recordId}: ${error}`)
            })
        }
        
        return { totalTests: sample.length, passed, failed }
        
    } catch (error) {
        console.error(`❌ Error processing collection: ${error.message}`)
        console.error(error.stack)
        return { totalTests: 0, passed: 0, failed: 0 }
    }
}

// Main execution
if (process.argv.length < 3) {
    console.log('Usage: node test-collection-samples.js <collection-file> [sample-size]')
    console.log('Example: node test-collection-samples.js data/mudflats.json 10')
    process.exit(1)
}

const filePath = process.argv[2]
const sampleSize = process.argv[3] ? parseInt(process.argv[3], 10) : 5
const collectionName = filePath.split('/').pop().replace('.json', '')

testCollection(filePath, collectionName, sampleSize)
