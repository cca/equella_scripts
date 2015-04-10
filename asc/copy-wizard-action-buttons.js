(function($) {
    var save = $('.save.action-button').clone().addClass('save-btn')
    var cancel = $('#wizard-actions').find('a[title="Cancel"]').clone().addClass('cancel-btn')
    var target = $('.js-bottom-wizard-actions')
    target.empty().append(save, '&nbsp;&nbsp;', cancel)
})(jQuery)
