#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { toStrictMODS } from './strict-mods.js'

// Create temp directory for validation files
try {
    mkdirSync('temp', { recursive: true })
} catch (e) {}

console.log('='.repeat(80))
console.log('MODS SCHEMA VALIDATION TEST')
console.log('='.repeat(80))

const testFiles = [
    { path: 'data/1.xml', name: 'data/1.xml' },
    { path: 'data/3.xml', name: 'data/3.xml' },
    { path: 'data/facresearch.json', name: 'facresearch (first record)', isJson: true, recordIndex: 0 },
    { path: 'data/mudflats.json', name: 'mudflats (first record)', isJson: true, recordIndex: 0 }
]

for (const testFile of testFiles) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Testing: ${testFile.name}`)
    console.log('='.repeat(80))
    
    let xml
    
    try {
        if (testFile.isJson) {
            const json = JSON.parse(readFileSync(testFile.path, 'utf-8'))
            const records = json.results || json
            if (!records[testFile.recordIndex] || !records[testFile.recordIndex].metadata) {
                console.log('❌ No metadata found in record')
                continue
            }
            xml = records[testFile.recordIndex].metadata
        } else {
            xml = readFileSync(testFile.path, 'utf-8')
        }
        
        // Convert to strict MODS
        const converted = toStrictMODS(xml)
        
        // Write to temp file
        const tempFile = `temp/test-${testFile.name.replace(/[^a-z0-9]/gi, '-')}.xml`
        writeFileSync(tempFile, converted, 'utf-8')
        
        // Validate with xmllint
        try {
            execSync(`xmllint --noout --schema data/mods.xsd ${tempFile}`, {
                encoding: 'utf-8',
                stdio: 'pipe'
            })
            console.log('✅ VALID - No schema errors!')
        } catch (error) {
            const output = error.stderr || error.stdout || ''
            
            // Parse errors
            const errorLines = output.split('\n').filter(line => 
                line.includes('fails to validate') || 
                line.includes('element') || 
                line.includes('Invalid') ||
                line.includes('No declaration')
            )
            
            console.log('⚠️  VALIDATION ERRORS:')
            
            // Count sublocationDetail errors
            const sublocationDetailErrors = errorLines.filter(l => 
                l.includes('sublocationDetail')
            ).length
            
            // Count other errors
            const otherErrors = errorLines.filter(l => 
                !l.includes('sublocationDetail')
            ).length
            
            console.log(`\n  sublocationDetail errors: ${sublocationDetailErrors} (expected)`)
            console.log(`  Other errors: ${otherErrors}`)
            
            if (otherErrors > 0) {
                console.log('\n  Other error details:')
                errorLines.filter(l => !l.includes('sublocationDetail')).forEach(line => {
                    console.log(`    ${line.trim()}`)
                })
            }
            
            if (sublocationDetailErrors > 0 && otherErrors === 0) {
                console.log('\n  ✅ Only expected sublocationDetail errors!')
            }
        }
        
    } catch (error) {
        console.log(`❌ Error processing: ${error.message}`)
    }
}

console.log('\n' + '='.repeat(80))
console.log('Validation complete')
console.log('='.repeat(80))
