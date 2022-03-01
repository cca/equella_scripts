"""
Usage: python fajr_process.py --semester "Fall 2020" input.csv

Takes CSV of Fine Arts juniors with their ID, names, majors, plus usernames &
then creates an openEQUELLA-ready taxonomy CSV named "taxo.csv". Uses fajr_group
to add users to user groups and upload.sh to add the taxonomy to VAULT.
"""

import argparse
import csv
import os
import sys

from fajr_group import add_to_fajr_group
from semester import semester


def parse_args():
    parser = argparse.ArgumentParser(description='Process CSV from Fine Arts into format ready for import into the "Fine Arts Junior Review students" taxonomy. Creates a "taxo.csv" file and then runs the "upload.sh" script to upload it to VAULT.')
    parser.add_argument('filename', help='CSV file')
    return parser.parse_args()


def map_major(major):
    """
    Map five-letter.three-letter degree code into human-friendly major
    e.g. ANIMA.BFA => Animation (BFA)
    We should really only need the Fine Arts majors here but including the
    full list costs us nothing.

    Commented-out degree codes don't have a correlate in VAULT's Majors taxo
    """
    translations = {
        # first saw this during Fall 2020, not sure how to handle it...
        'ANIMA.BFA': 'Animation (BFA)',
        'ARCHT.BARC': 'Architecture (BArch)',
        'CERAM.BFA': 'Ceramics (BFA)',
        'COMAR.BFA': 'Community Arts (BFA)',
        'CURPR.MA': 'Curatorial Practice (MA)',
        # 'DD2ST': '',
        'DESGN.MFA': 'Design (MFA)',
        # defunct as of Summer 2021
        'DESST.MBA': 'Design Strategy (MBA)',
        # 'DVCFA': '',
        # 'EXTED': '',
        'FASHN.BFA': 'Fashion Design (BFA)',
        'FCERM.MFA': 'Fine Arts (MFA)',
        'FDRPT.MFA': 'Fine Arts (MFA)',
        'FGLAS.MFA': 'Fine Arts (MFA)',
        'FILMG.MFA': 'Film (MFA)',
        'FILMS.BFA': 'Film (BFA)',
        'FINAR.MFA': 'Fine Arts (MFA)',
        'FPHOT.MFA': 'Fine Arts (MFA)',
        'FPRNT.MFA': 'Fine Arts (MFA)',
        'FRNTR.BFA': 'Furniture (BFA)',
        'FSCUL.MFA': 'Fine Arts (MFA)',
        'FSOCP.MFA': 'Fine Arts (MFA)',
        'FTEXT.MFA': 'Fine Arts (MFA)',
        'GAMES.BFA': 'Game Arts (BFA)',
        'GLASS.BFA': 'Glass (BFA)',
        'GRAPH.BFA': 'Graphic Design (BFA)',
        'GRAPH.MFA': 'Fine Arts (MFA)',
        'HAAVC.BA': 'History of Art & Visual Culture (BA)',
        'ILLUS.BFA': 'Illustration (BFA)',
        # 'INACT.MFA': '',
        'INDIV.BFA': 'Individualized (BFA)',
        'Individualized Studies': 'Individualized (BFA)',
        'INDUS.BFA': 'Industrial Design (BFA)',
        'INDUS.MFA': 'Industrial Design (MFA)',
        'INTER.BFA': 'Interior Design (BFA)',
        'IXDSN.BFA': 'Interaction Design (BFA)',
        'Jewelry and Metal Arts': 'Jewelry / Metal Arts (BFA)',
        'MAAD1.MAAD': 'Master of Advanced Architectural Design (MAAD)',
        # 'MARC2.MARC': '',
        # 'MARC3.MARC': '',
        'METAL.BFA': 'Jewelry / Metal Arts (BFA)',
        'NODEG.UG': 'Undecided',  # shouldn't appear in this context
        'PHOTO.BFA': 'Photography (BFA)',
        'PNTDR.BFA': 'Painting/Drawing (BFA)',
        'Painting and Drawing': 'Painting/Drawing (BFA)',
        'PRINT.BFA': 'Printmedia (BFA)',
        'SCULP.BFA': 'Sculpture (BFA)',
        'TEXTL.BFA': 'Textiles (BFA)',
        'UNDEC.BFA': 'Undecided',
        'VISCR.MA': 'Visual & Critical Studies (MA)',
        'VISST.BA': 'Visual Studies (BA)',
        'WRITE.MFA': 'Writing (MFA)',
        'WRLIT.BA': 'Writing & Literature (BA)'
    }

    if major in translations:
        return translations[major]
    # handle if Fine Arts sends us non-code versions of majors
    elif "{} (BFA)".format(major) in translations.values():
        return "{} (BFA)".format(major)
    # we don't know how to handle double majors anyways, just use them verbatim
    elif "(double major)" in major:
        return major
    else:
        raise Exception('Cannot translate degree code "{}" into major! Check the mappings.'.format(major))


def create_taxonomy(csvfile):
    with open(csvfile) as fh:
        fields = ('id', 'givenname', 'surname', 'major', 'username')
        reader = csv.DictReader(fh, fieldnames=fields)
        with open('taxo.csv', 'w') as taxofile:
            writer = csv.writer(taxofile, quoting=csv.QUOTE_ALL)
            users = []
            anima_users = []
            for row in reader:
                writer.writerow([
                    row['surname'] + ', ' + row['givenname'],
                    'studentID',
                    row['id'],
                    'username',
                    row['username'],
                    'major',
                    map_major(row['major']),
                    'semester',
                    semester(),
                ])

                users.append(row['username'])
                # ANIMA/FILM get their own group too, this also catches double majors
                if 'Animation' in row['major'] or 'Film' in row['major']:
                    anima_users.append(row['username'])

    print('Wrote openEQUELLA taxonomy file to taxo.csv')


def main(args):
    create_taxonomy(args.filename)
    add_to_fajr_group(users)
    add_to_fajr_group(anima_users, anima=True)
    os.system('./upload.sh')


if __name__ == '__main__':
    args = parse_args()
    main(args)
