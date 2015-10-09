// arch-coordinators.js
// Save Script to map ARCHT course to a coordinator role
// put the coordinator into local/notify which is later used in a Workflow
// MUST RUN AFTER COURSEINFO SPLITTING SCRIPT otherwise we don't know course

// ARCHT AD will email updates to this mapping as they change
var map = {
    'ARCHT-508': 'amarcus2',
    'MARCH-608': 'amarcus2',

    'ARCHT-211': 'akudless',
    'ARCHT-311': 'akudless',
    'INTER-208': 'akudless',
    'INTER-316': 'akudless',
    'MARCH-611': 'akudless',

    'MARCH-623': 'bprice',
    'MARCH-624': 'bprice',

    'ARCHT-220': 'icheng',
    'ARCHT-422': 'icheng',
    'INTER-222': 'icheng',
    'MARCH-620': 'icheng',
    'MARCH-621': 'icheng',
    'MARCH-622': 'icheng',

    'ARCHT-303': 'tanderson',

    'ARCHT-507': 'jmassey',
    'MARCH-607': 'jmassey',

    'ARCHT-201': 'ksidell',

    'MARCH-603': 'nschwartz',
}
var course = String(xml.get('local/courseInfo/courseName'))
var coordinator = map[course]
// guard against a course not in the mapping (e.g. coordinator is undefined)
if (coordinator) xml.set('local/notify', coordinator)
