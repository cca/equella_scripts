// this is client-side JS meant to be pasted into the browser's JS console
/**
 * this script was used to copy file names from attachments on "The Move" VAULT item
 * https://vault.cca.edu/logon.do?page=%2Fitems%2F10b12af9-3060-482e-805d-99418d9b6cf8%2F1%2F
 * give files an informative name, this script strips the ".jpg" off the end, enters it in the
 * title field, and adds an "image file JPEG" extent
 */
$('.wizard-parentcontrol').each((i, a) => {
	let name = $(a).find('a.MuiTypography-root.MuiLink-root.MuiLink-underlineHover.MuiTypography-colorPrimary').eq(0).text()
	let text = name.replace(/\.tif$/, '')
	// if text is diff then it was a .jpg filename
	if (name != text) {
		// insert page number
		$(a).find('.input.text').eq(0).find('input').val('page ' + name.match(/.*-(\d{1,2}).jpg/)[1])
		$(a).find('.input.text').eq(2).find('input').val('image file JPEG')
	}
})

/**
 * Executive Committee minutes
 * this script extracts the date and file type from filename and adds to the Date and Extent fields
 * as well as making a more readable (spaces instead of hyphens) File Title
 */
const extent_map = {
	'.pdf': 'text file PDF',
	'.jpg': 'image file JPEG',
	'.jpeg': 'image file JPEG',
	'.png': 'image file PNG',
	'.tif': 'image file TIFF',
	'.tiff': 'image file TIFF',
}
$('.wizard-parentcontrol').each((i, ctrl) => {
	// ensure we're in a mods/part repeater
	if ($(ctrl).find('label h3').eq(0).text().trim() === 'File Title') {
		let parts = {
			filename: $(ctrl).find('a.MuiTypography-root.MuiLink-root.MuiLink-underlineHover.MuiTypography-colorPrimary').eq(0).text()
		}
		try { parts.date = parts.filename.match(/\d{4}-\d{2}-\d{2}/)[0] } catch { }
		try { parts.extension = parts.filename.match(/\.[a-zA-Z0-9]+$/)[0] } catch { }
		try {
			// remove .pdf extension, turn special chars into spaces, re-apply spaces in the date
			parts.text = parts.filename.replace(parts.extension, '')
				.replace(/[|.\-_+^]/g, ' ')
			if (parts.date) parts.text = parts.text.replace(parts.date.replace(/-/g, ' '), parts.date)
		} catch { }
		console.log(parts)
		let inputs = $(ctrl).find('.input.text')
		if (parts.text) inputs.eq(0).find('input').val(parts.text)
		if (parts.date) inputs.eq(1).find('input').val(parts.date)
		if (parts.extension && extent_map[parts.extension.toLowerCase()]) {
			inputs.eq(2).find('input').val(extent_map[parts.extension.toLowerCase()])
		}
	}
})
