#!/usr/bin/env python

import json, datetime, logging, time
import webapp2
from google.appengine.ext import ndb

DATE_FORMAT = '%Y-%m-%dT%H:%M:%SZ'
EPOCH = datetime.datetime(1970, 1, 1)

def format_time(obj):
    return obj.strftime(DATE_FORMAT)
    #return str((obj - EPOCH).total_seconds())

def parse_time(formatted):
    return datetime.datetime.strptime(formatted, DATE_FORMAT)

class Person(ndb.Model):
    name = ndb.StringProperty()

class School(ndb.Model):
    name = ndb.StringProperty()
    full_name = ndb.StringProperty()
    abbreviation = ndb.StringProperty()
    mascot = ndb.StringProperty()
    primary_color = ndb.StringProperty()
    secondary_color = ndb.StringProperty()

class Matchup(ndb.Model):
    home_team = ndb.KeyProperty(kind=School)
    away_team = ndb.KeyProperty(kind=School)
    kickoff_time = ndb.DateTimeProperty()
    line = ndb.FloatProperty()

    winner = ndb.KeyProperty(kind=School)
    home_score = ndb.IntegerProperty()
    away_score = ndb.IntegerProperty()

class Week(ndb.Model):
    active_users = ndb.KeyProperty(kind=Person, repeated=True)
    matchups = ndb.KeyProperty(kind=Matchup, repeated=True)
    start_date = ndb.DateProperty()
    end_date = ndb.DateProperty()
    number = ndb.IntegerProperty()
    deadline = ndb.DateTimeProperty()

class Bet(ndb.Model):
    person = ndb.KeyProperty(kind=Person)
    matchup = ndb.KeyProperty(kind=Matchup)
    winner = ndb.KeyProperty(kind=School)
    points = ndb.IntegerProperty()
    number = ndb.IntegerProperty()
    time_placed = ndb.DateTimeProperty()    

class ReloadHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-type'] = 'text/plain';
        
        for clz in (Person, School, Matchup, Week, Bet):
            self.response.write('Clearing %s\n' % (clz.__name__))

            for inst in clz.query().fetch():
                inst.key.delete()

        time.sleep(1)
                
        self.response.write('\nLoading schools\n');
        with open('schools.json', 'r') as fp:
            for s in json.loads(fp.read()):
                school = School(name=s['name'], full_name=s['longName'],
                                abbreviation=s['abbreviation'], mascot=s['mascot'],
                                primary_color=s['primaryColor'],
                                secondary_color=s['secondaryColor'])
                school.put();

        self.response.write('Loading users\n')
        keith = Person(name='Keith')
        keith.put()
        frank = Person(name="Frank")
        frank.put()

        time.sleep(1)
        
        self.response.write('Loading matchups\n')
        m1 = Matchup(home_team = School.query(School.abbreviation == 'MSU').get().key,
                     away_team = School.query(School.abbreviation == 'PSU').get().key,
                     kickoff_time = datetime.datetime(2014, 8, 22, 12, 00), line=3.5,
                     winner = School.query(School.abbreviation == 'MSU').get().key,
                     home_score = 17, away_score = 11)
        m1.put()
        m2 = Matchup(home_team = School.query(School.abbreviation == 'Iowa').get().key,
                     away_team = School.query(School.abbreviation == 'NEB').get().key,
                     kickoff_time = datetime.datetime(2014, 8, 22, 15, 30), line=-10.5,
                     winner = School.query(School.abbreviation == 'NEB').get().key,
                     home_score = 24, away_score = 7)
        m2.put()

        self.response.write('Loading weeks\n')
        week = Week(active_users = [keith.key, frank.key],
                    matchups = [m1.key, m2.key],
                    start_date = datetime.date(2014, 8, 16),
                    end_date = datetime.date(2014, 8, 23),
                    number = 1,
                    deadline = datetime.datetime(2014, 8, 22, 12, 00))
        week.put()

        self.response.write('Loading bets\n')
        b = Bet(person=keith.key, matchup=m1.key,
                winner=School.query(School.abbreviation == 'MSU').get().key,
                points=20, number=1, time_placed=datetime.datetime(2014,8,21, 14, 33))
        b.put()
        b = Bet(person=keith.key, matchup=m2.key,
                winner=School.query(School.abbreviation == 'NEB').get().key,
                points=10, number=1, time_placed=datetime.datetime(2014,8,21, 15, 50))
        b.put()
        b = Bet(person=frank.key, matchup=m1.key,
                winner=School.query(School.abbreviation == 'PSU').get().key,
                points=55, number=1, time_placed=datetime.datetime(2014,8,19, 10, 04))
        b.put()
        
class MainHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write('Hello world!')

class SchoolHandler(webapp2.RequestHandler):
    def getAll(self):
        schools = [serializeSchool(s) for s in School.query().fetch()]
        out = { "school": schools }
        self.response.write(json.dumps(out))

    def get(self, school_id=None):
        if school_id is None:
            return self.getAll()
        
        out = { "school": serializeSchool(School.get_by_id(int(school_id))) }
        self.response.write(json.dumps(out))

    def post(self):
        d = json.loads(self.request.body)
        school = School(name=d['name'], full_name=d['fullName'],
                        abbreviation=d['abbreviation'], mascot=d['mascot'],
                        primary_color=d['primaryColor'],
                        secondary_color=d['secondaryColor'])
        self.response.write(school.put().id())

    def put(self, school_id):
        d = json.loads(self.request.body)
        school = School.get_by_id(int(school_id))

        if 'name'           in d: school.name = d['name']
        if 'fullName'       in d: school.full_name = d['fullName']
        if 'abbreviation'   in d: school.abbreviation = d['abbreviation']
        if 'mascot'         in d: school.mascot = d['mascot']
        if 'primaryColor'   in d: school.primary_color = d['primaryColor']
        if 'secondaryColor' in d: school.secondary_color = d['secondaryColor']
        school.put()

        self.response.write(serializeSchool(school))

class MatchupHandler(webapp2.RequestHandler):
    @staticmethod
    def serialize(matchup):
        m = {}
        m['id'] = matchup.key.id()
        m['line'] = matchup.line
        m['kickoff'] = format_time(matchup.kickoff_time)
        m['homeTeam'] = matchup.home_team.id()
        m['awayTeam'] = matchup.away_team.id()

        if matchup.winner is not None:
            m['winner'] = matchup.winner.id()
            m['homeScore'] = matchup.home_score
            m['awayScore'] = matchup.away_score
        else:
            m['winner'] = None
            m['homeScore'] = 0
            m['awayScore'] = 0
        
        return m

    def get(self, **kwargs):
        if 'matchup_id' in kwargs:
            m = Matchup.get_by_id(int(kwargs['matchup_id']))
            self.response.write(json.dumps({'matchup': MatchupHandler.serialize(m)}))
            return

        matchups = []

        for matchup in Matchup.query().fetch():
            matchups.append(MatchupHandler.serialize(matchup))

        self.response.write(json.dumps({"matchup": matchups}))

    def post(self):
        matchup = json.loads(self.request.body)['matchup']
        logging.debug(matchup)
        away = ndb.Key(School, matchup['awayTeam'])
        home = ndb.Key(School, matchup['homeTeam'])
        line = float(matchup['line'])
        kickoff = datetime.datetime.now()
        new = Matchup(home_team=home, away_team=away, line=line, kickoff_time=kickoff)
        key = new.put()
        self.response.write(json.dumps({'matchup': MatchupHandler.serialize(new)}))

    def put(self, matchup_id):
        matchup = Matchup.get_by_id(int(matchup_id))
        data = json.loads(self.request.body)['matchup']
        logging.debug(matchup)

        matchup.line = float(data['line'])
        #matchup.kickoff_time = parse_time(data['kickoff'])
        matchup.away_team = ndb.Key(School, data['awayTeam'])
        matchup.home_team = ndb.Key(School, data['homeTeam'])
        matchup.put()

        self.response.write(MatchupHandler.serialize(matchup))
        
class BetHandler(webapp2.RequestHandler):
    @staticmethod
    def serialize(bet):
        b = {}
        b['id'] = bet.key.id()
        b['person'] = bet.person.get().name
        b['matchup'] = bet.matchup.id()
        b['winner'] = bet.winner.id()
        b['points'] = bet.points
        return b

    def get(self):
        bets = []
        matchups = []

        for bet in Bet.query().fetch():
            matchups.append(MatchupHandler.serialize(bet.matchup.get()))
            bets.append(BetHandler.serialize(bet))

        self.response.write(json.dumps({"bet": bets, "matchup": matchups}))

    def post(self):
        person = Person.query(Person.name == "Keith").get()
        parent = ndb.Key(Person, person.key.id())
        jbids = json.loads(self.request.body)

        for jbid in jbids:
            matchup = Matchup.get_by_id(int(jbid['matchup']))
            week = Week.query(Week.matchups.IN([matchup.key])).get()

            if datetime.datetime.now() > week.deadline:
                self.response.status = 403
                return

            oldBetsQ = Bet.query(Bet.matchup == matchup.key, ancestor=parent)
            oldBetsQ = oldBetsQ.order(-Bet.number)

            oldBet = oldBetsQ.fetch(1)
            nextNumber = oldBet[0].number + 1 if len(oldBet) > 0 else 1
            
            winner = School.get_by_id(int(jbid['winner']))

            newBet = Bet(parent=parent, person=person.key, matchup=matchup.key,
                         winner=winner.key, points=int(jbid['points']),
                         number=nextNumber, time_placed=datetime.datetime.now())
            newKey = newBet.put()


def serializeSchool(model):
    out = {}
    out['id'] = model.key.id()
    out['name'] = model.name
    out['fullName'] = model.full_name
    out['abbreviation'] = model.abbreviation
    out['mascot'] = model.mascot
    out['primaryColor'] = model.primary_color
    out['secondaryColor'] = model.secondary_color
    return out

def serializeMatchup(model):
    out = {}
    out['id'] = model.key.id()
    out['line'] = model.line
    out['homeTeam'] = model.home_team.id()
    out['awayTeam'] = model.away_team.id()
    return out

class WeekHandler(webapp2.RequestHandler):
    def get(self, week_id):
        self.response.headers['Content-Type'] = 'application/json'
        week = Week.get_by_id(int(week_id))

        showAll = datetime.datetime.now() > week.deadline 
        current = Person.query(Person.name == 'Keith').get()

        response = {}
        schools = []
        response['schools'] = schools
        matchups = []
        response['matchups'] = matchups
        bets = []
        response['bets'] = bets

        for matchup in week.matchups:
            m = matchup.get()
            matchups.append(serializeMatchup(m))
            schools.append(serializeSchool(m.home_team.get()))
            schools.append(serializeSchool(m.away_team.get()))

        for person in week.active_users:
            if not showAll and person.id() != current.key.id():
                continue

            theseBets = { 'name': person.get().name, 'bets': [] }
            bets.append(theseBets)

            for matchup in week.matchups:
                bet = Bet.query(ndb.AND(Bet.matchup == matchup, Bet.person == person)).order(-Bet.number).get()
                serialized = { 'matchup': matchup.id() }
                theseBets['bets'].append(serialized)

                if bet is not None:
                    serialized['score'] = bet.points
                    serialized['winner'] = bet.winner.id()
                else:
                    serialized['score'] = 0
                    serialized['winner'] = None

        self.response.write(json.dumps(response))

class WeekBetsHandler(webapp2.RequestHandler):
    def get(self, **kwargs):
        self.response.write(json.dumps({'bet': []}))

class CurrentBetsHandler(webapp2.RequestHandler):
    def get(self, **kwargs):
        out = {}
        out['bets'] = []
        out['matchups'] = []
        out['editable'] = True
        bets = []
        matchups = []
        
        week = Week.query().get()
        out['id'] = week.key.id()

        out['users'] = [u.id() for u in week.active_users]
        users = [{ 'id': u.id(), 'name': u.get().name } for u in week.active_users]
        
        for matchup in week.matchups:
            out['matchups'].append(matchup.id())
            matchups.append(MatchupHandler.serialize(matchup.get()))
            
            for bet in Bet.query(Bet.matchup == matchup).fetch():
                out['bets'].append(bet.key.id())
                bets.append(BetHandler.serialize(bet))

        self.response.write(json.dumps({ 'week': out, 'bet': bets,
                                         'matchup': matchups, 'user': users }))

app = webapp2.WSGIApplication([
    webapp2.Route(r'/', MainHandler),
    webapp2.Route(r'/api/weeks/current/bets', CurrentBetsHandler),
    webapp2.Route(r'/api/weeks/<week_id:\d+>', WeekHandler),
    webapp2.Route(r'/api/weeks/<week_id:\d+>/bets', CurrentBetsHandler),
    webapp2.Route(r'/api/bets', BetHandler),
    webapp2.Route(r'/api/bets/current', BetHandler),
    webapp2.Route(r'/api/schools', SchoolHandler),
    webapp2.Route(r'/api/schools/<school_id:\d+>', SchoolHandler),
    webapp2.Route(r'/api/matchups', MatchupHandler),
    webapp2.Route(r'/api/matchups/<matchup_id:\d+>', MatchupHandler),
    webapp2.Route(r'/api/reload', ReloadHandler),
], debug=True)
