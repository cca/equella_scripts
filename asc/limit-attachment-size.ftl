<#assign removed = xml.get('removed')>
<#if removed != "">
    <div class="control">
        <p class="alert alert-error"><b>The following files were removed because they were too large</b>: ${removed}.</p>
    </div>
</#if>
