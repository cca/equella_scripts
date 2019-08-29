// arch-coordinators.js
// Save Script to map ARCHT course to a coordinator role
// put the coordinator into local/notify which is later used in a Workflow
// MUST RUN AFTER COURSEINFO SPLITTING SCRIPT otherwise we don't know course

// ARCHT AD will email updates to this mapping as they change
var map = {
    'ARCHT-508': 'ryan.keerns',
    'BARCH-508': 'ryan.keerns',
    'MARCH-608': 'ryan.keerns',

    'ARCHT-211': 'akudless',
    'ARCHT-311': 'akudless',
    'BARCH-211': 'akudless',
    'BARCH-311': 'akudless',
    'INTER-208': 'akudless',
    'INTER-316': 'akudless',
    'MARCH-611': 'akudless',

    'MARCH-623': 'bprice',
    'MARCH-624': 'bprice',

    'BARCH-220': 'icheng',
    'ARCHT-422': 'icheng',
    'BARCH-422': 'icheng',
    'INTER-222': 'icheng',
    'MARCH-620': 'icheng',
    'MARCH-621': 'icheng',
    'MARCH-622': 'icheng',

    'ARCHT-303': 'tanderson',
    'BARCH-303': 'tanderson',

    'ARCHT-507': 'jmassey',
    'BARCH-507': 'jmassey',
    'MARCH-607': 'jmassey',

    'ARCHT-201': 'clarkt',
    'BARCH-201': 'clarkt',

    // per Neal Schwartz 1/4/19 email he's not the coordinator
    // 'MARCH-603': 'nschwartz',

    // testing purposes, this is the UUID of "eric1" user
    'TESTS-101': '13dc7262-16f0-4b6b-b648-be73d2b7d15f'
}
var course = String(xml.get('local/courseInfo/courseName'))
// make this work for 4-digit course codes (ARCHT-2110) added in 2019
var coordinator = map[course] || map[course.substr(0, 9)]
// guard against a course not in the mapping (e.g. coordinator is undefined)
if (coordinator) xml.set('local/notify', coordinator)
