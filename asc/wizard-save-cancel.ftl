<#-- DANGER DANGER DON'T USE THIS
duplicates HTML IDs which is never good
also relies very heavily on EQUELLA's internal scripts & structure
so it'll almost certainly break with every upgrade

still, this is a proof-of-concept for making the Save / Cancel buttons
into an ASC that can be placed in any part of a Wizard page  -->
<div class="clearfix">
	<div id="wizard-major-actions" style="margin:10px">
		<input class="save action-button" type="button" value="Save" onclick="openAjaxDialog('1wrap',_f(),'$UP2$1.show',[],function(){$.fancybox(_e('1wrap'),{width:500,height:'auto',autoDimensions:false,autoScale:false,type:'inline',modal:true,scrolling:false,padding:0,margin:0,onComplete:function(){focusOnLoad(null);}
	});}
	,$.fancybox.showActivity,(function(){}));return false;"
		style="float:left;margin-right:10px">
	</div>
	<div id="wizard-actions">
		<a href="javascript:void(0);" title="Cancel" onclick="if (!(confirm('Are you sure you want to cancel?'))){return false;}_subev('nav.command','cancel','');return false;">Cancel</a>
	</div>
</div>
