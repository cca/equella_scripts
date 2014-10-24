/*jshint browser:true */
// to be included inside <script> tags in an ASC
// removes the actions associated with attachments (edit, replace, delete)
// any ones you want to preserve, put in the "links to show" sectopm
(function(){
var links_to_show = [" "];

var showAttachmentLinks = function(actions) {
  var innerHTML = "";
  for ( var i = 0, action = actions[i];  i < actions.length;  action = actions[++i] ) {
    if (i > 0) {
      innerHTML += " | ";
    }
    innerHTML += $(".universalresources .actions a:contains('" + action + "')").clone().wrap('<div />').parent().html();
  }
  $(".universalresources .actions").html(innerHTML);
};

var showLinksHandler = function() {
  showAttachmentLinks(links_to_show);
};

$(document).ready(showLinksHandler);
$(document).ajaxSuccess(showLinksHandler);
}());
