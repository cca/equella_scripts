// add all faculty members listed as instructors
// to the item as collaborators so they can see/edit it
var faculties = String(xml.get('local/courseInfo/facultyID')).split(', ')
// items don't have an owner upon initial contribution, in which case
// the uploading user is about to become the owner
var owner = currentItem.getOwner() || user.getUsername()
var len = faculties.length

for (var i = 0; i < len; i++) {
    var un = faculties[i]

    if (un != '' && un != owner) {
        currentItem.addSharedOwner(faculties[i])
    }
}
