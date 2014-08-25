#!/usr/bin/env python

import json, datetime, logging, time
import webapp2
from google.appengine.ext import ndb

DATE_FORMAT = '%Y-%m-%dT%H:%M:%S'

def format_time(obj):
    return obj.isoformat()

def parse_time(formatted):
    formatted = formatted[:-6]
    return datetime.datetime.strptime(formatted, DATE_FORMAT)

class User(ndb.Model):
    name = ndb.StringProperty()
    active = ndb.BooleanProperty()
    admin = ndb.BooleanProperty()
    order = ndb.IntegerProperty()

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
    active_users = ndb.KeyProperty(kind=User, repeated=True)
    matchups = ndb.KeyProperty(kind=Matchup, repeated=True)
    start_date = ndb.DateProperty()
    end_date = ndb.DateProperty()
    season = ndb.StringProperty()
    number = ndb.IntegerProperty()
    deadline = ndb.DateTimeProperty()

class Bet(ndb.Model):
    winner = ndb.KeyProperty(kind=School)
    points = ndb.IntegerProperty()
    time_placed = ndb.DateTimeProperty()

class Picks(ndb.Model):
    week = ndb.KeyProperty(kind=Week)
    user = ndb.KeyProperty(kind=User)
    matchup = ndb.KeyProperty(kind=Matchup)
    bets = ndb.StructuredProperty(Bet, repeated=True)

def serializeSchool(out, school):
    s = {}
    s['id'] = school.key.id()
    s['name'] = school.name
    s['fullName'] = school.full_name
    s['abbreviation'] = school.abbreviation
    s['mascot'] = school.mascot
    s['primaryColor'] = school.primary_color
    s['secondaryColor'] = school.secondary_color
    return s

def serializeUser(out, user):
    p = {}
    p['id'] = user.key.id()
    p['name'] = user.name
    p['active'] = user.active
    p['order'] = user.order
    p['admin'] = user.admin
    return p

def serializeMatchup(out, matchup):
    m = {}
    m['id'] = matchup.key.id()
    m['line'] = matchup.line
    m['kickoff'] = format_time(matchup.kickoff_time)

    m['homeTeam'] = matchup.home_team.id()
    m['awayTeam'] = matchup.away_team.id()

    appendSideModel(out, matchup.home_team.get())
    appendSideModel(out, matchup.away_team.get())

    if matchup.winner is not None:
        m['winner'] = matchup.winner.id()
        m['homeScore'] = matchup.home_score
        m['awayScore'] = matchup.away_score
    else:
        m['winner'] = None
        m['homeScore'] = 0
        m['awayScore'] = 0

    return m

def serializeBet(out, bet):
    b = {}
    b['id'] = bet.key.id()
    b['person'] = bet.user.get().name
    b['matchup'] = bet.matchup.id()
    b['winner'] = bet.winner.id()
    b['points'] = bet.points
    
    appendSideModel(out, bet.matchup.get())
    appendSideModel(out, bet.winner.get())

    return b

def serializeWeek(out, week):
    w = {}
    w['id'] = week.key.id()
    w['editable'] = True
    w['users'] = []
    w['matchups'] = []

    for u in week.active_users:
        w['users'].append(u.id())
        appendSideModel(out, u.get())

    for m in week.matchups:
        w['matchups'].append(m.id())
        appendSideModel(out, m.get())

    return w

def serializeEditableWeek(out, week):
    w = serializeWeek(out, week)

    w['startDate'] = format_time(week.start_date)
    w['endDate'] = format_time(week.end_date)
    w['deadline'] = format_time(week.deadline)
    w['season'] = week.season
    w['number'] = week.number

    return w
    
    
EMBER_MODEL_NAMES = { User: 'user', School: 'school', Matchup: 'matchup',
                      Bet: 'bet', Week: 'week' }

SERIALIZERS = { User: serializeUser, School: serializeSchool,
                Matchup: serializeMatchup, Bet: serializeBet,
                Week: serializeWeek }

def appendSideModel(out, model):
    key = EMBER_MODEL_NAMES[type(model)]
    if key not in out: out[key] = []
    for m in out[key]:
        if m['id'] == model.key.id(): return
    out[key].append(SERIALIZERS[type(model)](out, model))

def serialize(out, model):
    serialized = SERIALIZERS[type(model)](out, model)
    key = EMBER_MODEL_NAMES[type(model)]
    if key in out:
        out[key].append(serialized)
    else:
        out[key] = serialized

    return out

def deserializeUser(user, serialized):
    if user is None:
        user = User(name = serialized['name'],
                    active = serialized['active'],
                    order = serialized['order'],
                    admin = serialized['admin'])
    else:
        user.name = serialized['name']
        user.active = serialized['active']
        user.order = serialized['order']
        user.admin = serialized['admin']

    return user

def deserializeSchool(school, data):
    if school is None:
        school = School(name=data['name'],
                        full_name=data['fullName'],
                        abbreviation=data['abbreviation'],
                        mascot=data['mascot'],
                        primary_color=data['primaryColor'],
                        secondary_color=data['secondaryColor'])
    else:
        school.name = data['name']
        school.full_name = data['fullName']
        school.abbreviation = data['abbreviation']
        school.mascot = data['mascot']
        school.primary_color = data['primaryColor']
        school.secondary_color = data['secondaryColor']

    return school

class UsersHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'application/json'

        out = { 'user': [] }
        for user in User.query().fetch():
            serialize(out, user);

        self.response.write(json.dumps(out))

    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        data = json.loads(self.request.body)['user']
        user = deserializeUser(None, data)
        user.put()
        self.response.write(json.dumps(serialize({}, user)))

    def put(self, user_id):
        self.response.headers['Content-Type'] = 'application/json'
        data = json.loads(self.request.body)['user']
        user = deserializeUser(User.get_by_id(long(user_id)), data)
        user.put()
        self.response.write(json.dumps(serialize({}, user)))
        

class ReloadHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-type'] = 'text/plain';
        
        for clz in (User, School, Matchup, Week, Bet):
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
        keith = User(name='Keith', active=True)
        keith.put()
        frank = User(name="Frank", active=True)
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
        b = Bet(user=keith.key, matchup=m1.key,
                winner=School.query(School.abbreviation == 'MSU').get().key,
                points=20, number=1, time_placed=datetime.datetime(2014,8,21, 14, 33))
        b.put()
        b = Bet(user=keith.key, matchup=m2.key,
                winner=School.query(School.abbreviation == 'NEB').get().key,
                points=10, number=1, time_placed=datetime.datetime(2014,8,21, 15, 50))
        b.put()
        b = Bet(user=frank.key, matchup=m1.key,
                winner=School.query(School.abbreviation == 'PSU').get().key,
                points=55, number=1, time_placed=datetime.datetime(2014,8,19, 10, 04))
        b.put()
        
class MainHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write('Hello world!')

class SchoolHandler(webapp2.RequestHandler):
    def getAll(self):
        out = { "school": [] }
        for s in School.query().fetch(): serialize(out, s)
        self.response.write(json.dumps(out))

    def get(self, school_id=None):
        self.response.headers['Content-Type'] = 'application/json'
        if school_id is None:
            return self.getAll()

        school = School.get_by_id(long(school_id))
        self.response.write(json.dumps(serialize({}, school)))

    def post(self):
        d = json.loads(self.request.body)['school']
        school = deserializeSchool(None, d)
        school.put()
        self.response.write(json.dumps(serialize({}, school)))

    def put(self, school_id):
        d = json.loads(self.request.body)['school']
        school = School.get_by_id(long(school_id))
        deserializeSchool(school, d).put()
        self.response.write(json.dumps(serialize({}, school)))

class MatchupHandler(webapp2.RequestHandler):
    def get(self, **kwargs):
        self.response.headers['Content-Type'] = 'application/json'
        if 'matchup_id' in kwargs:
            m = Matchup.get_by_id(long(kwargs['matchup_id']))
            self.response.write(json.dumps(serialize({}, m)))
            return

        out = { 'matchup': [] }

        for matchup in Matchup.query().fetch():
            serialize(out, matchup)

        self.response.write(json.dumps(out))

    def post(self):
        matchup = json.loads(self.request.body)['matchup']

        away = ndb.Key(School, long(matchup['awayTeam']))
        home = ndb.Key(School, long(matchup['homeTeam']))
        
        line = float(matchup['line'])
        kickoff = datetime.datetime.now()
        new = Matchup(home_team=home, away_team=away, line=line, kickoff_time=kickoff)
        key = new.put()
        self.response.write(json.dumps(serialize({}, new)))

    def put(self, matchup_id):
        matchup = Matchup.get_by_id(long(matchup_id))
        data = json.loads(self.request.body)['matchup']

        matchup.line = float(data['line'])
        matchup.kickoff_time = parse_time(data['kickoff'])
        matchup.away_team = ndb.Key(School, long(data['awayTeam']))
        matchup.home_team = ndb.Key(School, long(data['homeTeam']))

        if 'awayScore' in data: matchup.away_score = int(data['awayScore']) 
        if 'homeScore' in data: matchup.home_score = int(data['homeScore'])

        matchup.put()

        self.response.write(json.dumps(serialize({}, matchup)))

class WeeksHandler(webapp2.RequestHandler):
    def get(self, **kwargs):
        self.response.headers['Content-Type'] = 'application/json'

        if 'week_id' in kwargs:
            week_id = long(kwargs['week_id'])
            week = Week.get_by_id(week_id)
            out = {}
            out['week'] = serializeEditableWeek(out, week)
            self.response.write(json.dumps(out))
            return

        out = {}
        out['week'] = [serializeEditableWeek(out, w) for w in Week.query().fetch()]
        self.response.write(json.dumps(out))

    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        data = json.loads(self.request.body)
        data = data['week']

        users = [u.key for u in User.query(User.active == True).fetch()]
        matchups = [Matchup.get_by_id(long(mid)).key for mid in data['matchups']]
        
        week = Week(start_date = parse_time(data['startDate']),
                    end_date = parse_time(data['endDate']),
                    deadline = parse_time(data['deadline']),
                    season = str(data['season']),
                    number = int(data['number']),
                    matchups = matchups,
                    active_users = users)
        week.put()

        out = {}
        out['week'] = serializeEditableWeek(out, week)
        self.response.write(json.dumps(out))

    def put(self, week_id):
        self.response.headers['Content-Type'] = 'application/json'
        data = json.loads(self.request.body)
        data = data['week']

        week = Week.get_by_id(long(week_id))
        week.start_date = parse_time(data['startDate'])
        week.end_date = parse_time(data['endDate'])
        week.deadline = parse_time(data['deadline'])
        week.season = str(data['season'])
        week.number = int(data['number'])

        matchups = [ndb.Key('Matchup', long(m)) for m in data['matchups']]
        week.matchups = matchups

        week.put()

        out = {}
        out['week'] = serializeEditableWeek(out, week)
        self.response.write(json.dumps(out))

class PicksHandler(webapp2.RequestHandler):
    def past_deadline(self, week):
        return True
        return datetime.datetime.now() >= week.deadline

    def get(self, **kwargs):
        self.response.headers['Content-Type'] = 'application/json'

        if 'week_id' in kwargs:
            week = Week.get_by_id(long(kwargs['week_id']))
        elif '/current' in self.request.path_url:
            week = self.get_current_week()
        else:
            return

        editable = not self.past_deadline(week)
        picks = {}
        out = { 'picks': picks }

        picks['id'] = week.key.id()
        picks['editable'] = editable
        picks['users'] = []
        picks['matchups'] = []
        picks['bets'] = []

        current_user = User.query(User.name == 'Keith').get()
        active_users = week.active_users if not editable else [current_user.key]
        
        for u in active_users:
            picks['users'].append(u.id())
            appendSideModel(out, u.get())

        for m in week.matchups:
            picks['matchups'].append(m.id())
            appendSideModel(out, m.get())

        query = Picks.week == week.key
        if editable:
            query = ndb.AND(query, Picks.user == current_user.key)
        
        for p in Picks.query(query):
            if len(p.bets) == 0: continue
            
            b = p.bets[-1]
            bet = { 'user': p.user.id(),
                    'matchup': p.matchup.id(),
                    'winner': b.winner.id(),
                    'points': b.points }
            picks['bets'].append(bet)

        self.response.write(json.dumps(out))

    def get_current_week(self):
        return Week.query().get()

    def put(self, week_id):
        self.response.headers['Content-Type'] = 'application/json'
        data = json.loads(self.request.body)['pick']
        current_user = User.query(User.name == 'Keith').get()

        if 'user' in data:
            current_user = User.get_by_id(long(data['user']))
            logging.info('Overriding user to ' + current_user.name)
            
        week = Week.get_by_id(long(week_id))
        if self.past_deadline(week):
            self.response.status = 422
            return

        # TODO: validate that the matchups are in that week

        for bet in data['bets']:
            matchup = ndb.Key(Matchup, long(bet['matchup']))
            winner = ndb.Key(School, long(bet['winner']))
            points = int(bet['points'])

            picksQ = Picks.query(ndb.AND(Picks.matchup == matchup,
                                         Picks.user == current_user.key))
            picks = picksQ.get()
            if picks is None:
                picks = Picks(week = week.key, user = current_user.key,
                              matchup = matchup, bets = [])
            else:
                old = picks.bets[-1]
                if old.winner == winner and old.points == points:
                    continue

            betRecord = Bet(winner = winner, points = points,
                            time_placed = datetime.datetime.now())

            picks.bets.append(betRecord)
            picks.put()

app = webapp2.WSGIApplication([
    webapp2.Route(r'/', MainHandler),
    webapp2.Route(r'/api/users', UsersHandler),
    webapp2.Route(r'/api/users/<user_id:\d+>', UsersHandler),
    webapp2.Route(r'/api/picks', PicksHandler),
    webapp2.Route(r'/api/picks/current', PicksHandler),
    webapp2.Route(r'/api/picks/<week_id:\d+>', PicksHandler),
    webapp2.Route(r'/api/weeks', WeeksHandler),
    webapp2.Route(r'/api/weeks/<week_id:\d+>', WeeksHandler),
    webapp2.Route(r'/api/schools', SchoolHandler),
    webapp2.Route(r'/api/schools/<school_id:\d+>', SchoolHandler),
    webapp2.Route(r'/api/matchups', MatchupHandler),
    webapp2.Route(r'/api/matchups/<matchup_id:\d+>', MatchupHandler),
    webapp2.Route(r'/api/reload', ReloadHandler),
], debug=True)
