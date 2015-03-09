-- open {{current URL}}<XML> in current browser tab
-- written as an Alfred Workflow; if you're using in some other trigger
-- remove the "on alfred_script" wrapper around it
-- also probably wise to set this to only trigger when a web browser has focus
on alfred_script(q)
	-- this moves focus to omnibar in Chrome, most every web browser does same
 	tell application "System Events" to keystroke "l" using command down
	-- 124 is right arrow
	tell application "System Events" to key code 124
	tell application "System Events" to keystroke "<XML>"
	tell application "System Events" to keystroke return
end alfred_script
