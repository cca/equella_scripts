<#-- a proof-of-concept for making the Save / Cancel buttons
into an ASC that can be placed in any part of a Wizard page  -->
<br><br>
<div class="clearfix js-bottom-wizard-actions">
</div>
<script>
(function($) {
    var save = $('.save.action-button').clone().addClass('save-btn')
    var cancel = $('#wizard-actions').find('a[title="Cancel"]').clone().addClass('cancel-btn')
    var target = $('.js-bottom-wizard-actions')
    target.empty().append(save, '&nbsp;&nbsp;', cancel)
})(jQuery)
</script>
<style>
.save-btn,
.cancel-btn {
    background: #7b2 url("/p/r/6.3.r2083/com.tle.web.ALLICONS/images/tick 2.png") 10px center / 14px no-repeat;
    border-bottom: 1px solid #390;
    border-radius: 3px;
    color: #000;
    padding-left: 40px;
    transition: all 0.1s ease-out;
    width: 90px
}

input.save-btn:hover,
a.cancel-btn:hover {
    background-color: #9c0;
    background-position: 10px center;
    color: #000;
}

a.cancel-btn {
    background: #e44 url("/p/r/6.3.r2083/com.tle.web.ALLICONS/images/error 2.png") 10px center / 14px no-repeat;
    border-bottom-color: #b11;
	color: #000;
    width: 50px;
    font-weight: bold;
    display: inline-block;
    line-height: 28px;
}

a.cancel-btn:hover {
    background-color: #e22;
    text-decoration: none !important;
}
</style>
