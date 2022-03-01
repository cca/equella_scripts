from datetime import date

def semester(today=date.today()):
    """ return the current semester's string in "Season YYYY" format
    e.g. "Spring 2022"
    """
    if today.month > 8:
        return "Fall {}".format(today.year)
    elif today.month < 5 or today.month == 5 and today.day < 16:
        return "Spring {}".format(today.year)
    else:
        return "Summer {}".format(today.year)
