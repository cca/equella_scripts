<#--
simple, flawed
copy Save, Cancel buttons & append to end of contrib wizard
problems are:
1) now we have multiple of these IDs in the DOM, unpredictable JS interactions
2) they're still stacked vertically & display:block, not sitting side-by-side
-->
<script>
$(function(){

var saveBtn = $('#wizard-major-actions').clone()
var cancelBtn = $('#wizard-actions').clone()
var area = $('.area')

if (!area.find('#wizard-major-actions, #wizard-actions').length) {
    area.append(saveBtn).append(cancelBtn)
}

})
</script>
