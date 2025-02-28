// ! NOTE: this depends on the order of the year control!!!
/* Create a Edit Box control where you expect a 4-digit year and add its 0-based index
below. Following the Edit Box, add an Advanced Scripting control with a display script that
matches the criteria here, e.g.
var date = xml.get('/mods/origininfo/dateCreatedWrapper/dateCreated')
if ( date != "" && !date.match(/^[0-9]{4}$/) )
{
    return true
}
return false

Then make the Display Template of that control warning HTML like:
<p class="alert alert-error">Error: the thesis date must be a four-digit year.</p>
*/
// https://openequella.github.io/api-docs/Script/api/com/tle/web/wizard/scripting/objects/ControlScriptObject.html
var dateControl = page.getControlByIndex(1)
var date = dateControl.getValue()
if (!date.match(/^[0-9]{4}$/)) {
    // ! Message does not show to the user :( thus all the extra steps in the comment
    dateControl.setInvalid(true, "Error: please enter a valid four-digit date like 2025.")
} else {
    dateControl.clearInvalid()
}
