import os
import json
import requests

"""
Takes new usernames for FAJR students and adds them to the permissions group in
EQUELLA using the API. Requires having a properly configured OAuth token in an
".equellarc" JSON file in your home directory (see equella-cli for details).
"""
def add_to_fajr_group(users, anima=False):
    # get equellarc JSON (only works on Linux/Mac)
    try:
        equellarc = json.load(open(os.getenv('HOME') + '/.equellarc'))
    except:
        print('Error opening the ~/.equellarc file, make sure it exists & is valid JSON')
        exit(1)

    # get group data from EQUELLA API
    if anima:
        # "FA JR film and animation students" group
        uuid = '3a3eb91d-c96b-4e8c-8a4d-1910da66a7c0'
    else:
        # "FA JR exhibit students" group
        uuid = '80530ad8-3d08-4617-b99a-3de3f20fb587'
    url = 'https://vault.cca.edu/api/usermanagement/local/group/%s' % uuid
    headers = {
        'X-Authorization': 'access_token=' + equellarc['token'],
        'Content-Type': 'application/json'
    }

    try:
        r = requests.get(url, headers=headers)
    except:
        print('Error getting data from EQUELLA API. Check .equellarc OAuth token & network access.')
        exit(1)

    group = r.json()
    num_users = len(group['users'])

    # add new fajr usernames to the JSON response's "users" array
    # first convert list to Python Set data type to ensure no dupes
    group['users'] = set(group['users'])
    for user in users:
        group['users'].add(user)

    num_new_users = len(group['users']) - num_users
    # convert users _back_ to a list bc set is not JSON serializable
    group['users'] = list(group['users'])

    if anima:
        print('Adding %i users to "FA JR film and animation students" group...' % num_new_users)
    else:
        print('Adding %i users to "FA JR exhibit students" group...' % num_new_users)

    # tried wrapping the PUT in a try/except block but the exception always
    # triggered even on successful 200 requests :shrug:
    p = requests.put(url, headers=headers, data=json.dumps(group))
