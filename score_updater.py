#!/usr/bin/python

import urllib2, logging, sys
from BeautifulSoup import BeautifulSoup

SCHOOLS = {
    'Michigan State': 6348094002167808,
    'Iowa': 5310356083703808,
    'Purdue': 5265327378137088,
    'Wisconsin': 6372288358252544,
    'Minnesota': 5242036307361792,
    'Michigan': 5318818779889664,
    'Illinois': 5237101121503232,
    'Nebraska': 4972385644052480,
    'Northwestern': 5540296553136128,
    'Penn State': 4935758162952192,
    'Rutgers': 5194958633959424,
    'Maryland': 4512505510494208,
    'Indiana': 4978930100469760,
    'Ohio State': 5004014856962048
}

def update(week):
    try:
        url = 'http://scores.nbcsports.msnbc.com/cfb/scoreboard.asp?conf=1a%%3A004&week=%02d' % (week.number)
        logging.info('Fetching scores from %s' % (url))
        doc = urllib2.urlopen(url)
        matchups = [m.get() for m in week.matchups]
        soup = BeautifulSoup(doc)
        logging.info("Updating scores for week %d" % (week.number))
        update_scores(matchups, soup)
        logging.info("Done updating scores for week %d" % (week.number))
        return True
    except Exception:
        logging.exception("Error updating scores")
        return False

def update_scores(matchups, doc):
    for table in doc.findAll('table', { 'class': 'shsTable shsLinescore' }):
        table = table.find('table')
        if table is None: continue
        update_score(matchups, table)

def update_score(matchups, table):
    rows = table.findAll('tr')
    if len(rows) < 3: return None
    
    title, away, home = rows[0], rows[1].findAll('td'), rows[2].findAll('td')

    final = title.td.text == 'Final'

    if len(away) < 6 or len(home) < 6:
        logging.info("Skipping pre-kickoff game %s at %s" % (away[0].text, home[0].text))
        return

    awayTeam = away[0].text
    awayTeamId = get_school_id(awayTeam)
    awayScore = away[-1].text

    homeTeam = home[0].text
    homeTeamId = get_school_id(homeTeam)
    homeScore = home[-1].text

    teams = "%s at %s" % (awayTeam, homeTeam)

    if awayTeam is None and homeTeam is None:
        logging.warn("Could not find Big 10 team for " + teams)
        return

    matchup = find_matchup(matchups, awayTeamId, homeTeamId)
    if matchup is None:
        logging.warn("Could not find matchup for " + teams)
        return
    if matchup.final: return

    logging.info("Updating score %s %s, %s %s" % (awayTeam, str(awayScore),
                                                  homeTeam, str(homeScore)))

    matchup.away_score = int(awayScore)
    matchup.home_score = int(homeScore)
    matchup.final = final
    matchup.put()

def get_school_id(team):
    for s in SCHOOLS:
        if s in team: return SCHOOLS[s]
    return None

def find_matchup(matchups, awayTeam, homeTeam):
    for matchup in matchups:
        if matchup.home_team.id() == homeTeam:
            return matchup
        if matchup.away_team.id() == awayTeam:
            return matchup
    return None
