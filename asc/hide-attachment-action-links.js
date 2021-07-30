// to be included inside <script> tags in an ASC
// removes the actions associated with attachments (edit, replace, delete)
// any ones you want to preserve, put in the "links to show" section
(function($){
    let links_to_show = [" "]

    function showAttachmentLinks (actions) {
        let innerHTML = ""
        for ( let i = 0, action = actions[i];  i < actions.length;  action = actions[++i] ) {
            if (i > 0) innerHTML += " | "
            innerHTML += $(".universalresources .actions a:contains('" + action + "')").clone().wrap('<div />').parent().html()
        }
        $(".universalresources .actions").html(innerHTML)
    }

    function showLinksHandler () {
        showAttachmentLinks(links_to_show)
    }

    $(document).ready(showLinksHandler)
    $(document).ajaxSuccess(showLinksHandler)
}(jQuery));
