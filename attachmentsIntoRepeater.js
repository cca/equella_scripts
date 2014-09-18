// script to break multiple attachments (at local/staging/file) out
// into a repeater (at mods/part) so attachments can have individual
// metadata nodes associated with them
//
// this is typically put in the On-Submit Script section of an Advanced
// Scripting Control at the bottom of the Wizard page where the
// attachments control is
var iter = xml.list('/local/staging/file').listIterator(),
    index;

while (iter.hasNext()) {
    index = iter.nextIndex();
    xml.set('/mods/part[' + index + ']/number', iter.next());
}
