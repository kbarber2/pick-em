#!/usr/bin/env python

import json, datetime, logging, time, struct, base64, random
import webapp2
from webapp2_extras import sessions
from google.appengine.ext import ndb
from Crypto.Cipher import AES
from Crypto import Random

KEY = 'secretkey1234567'
DATE_FORMAT = '%Y-%m-%dT%H:%M:%S'

def format_time(obj):
    return obj.isoformat()

def parse_time(formatted):
    formatted = formatted[:-6]
    return datetime.datetime.strptime(formatted, DATE_FORMAT)

class User(ndb.Model):
    name = ndb.StringProperty()
    email = ndb.StringProperty()
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
    p['email'] = user.email
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

    m['homeScore'] = matchup.home_score
    m['awayScore'] = matchup.away_score

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
    if key in out and type(out[key]) == list:
        out[key].append(serialized)
    else:
        out[key] = serialized

    return out

def deserializeUser(user, serialized):
    if user is None:
        user = User(name = serialized['name'],
                    email = serialized['email'],
                    active = serialized['active'],
                    order = serialized['order'],
                    admin = serialized['admin'])
    else:
        user.name = serialized['name']
        user.email = serialized['email']
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

class BaseHandler(webapp2.RequestHandler):
    def dispatch(self):
        self.session_store = sessions.get_store(request=self.request)

        perms = self.requires_user()
        if len(perms) > 0 and self.current_user is None and self.request.method in perms:
            self.resonse.status = 401
            return

        try:
            webapp2.RequestHandler.dispatch(self)
        finally:
            self.session_store.save_sessions(self.response)

    @webapp2.cached_property
    def session(self):
        return self.session_store.get_session()

    @webapp2.cached_property
    def current_user(self):
        if 'user' not in self.session: return None
        return User.get_by_id(long(self.session['user']))

    def requires_user(self):
        return []

    def write_error(self, code, msg):
        self.response.status = code
        self.response.write(json.dumps({ 'error': msg }))
        
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

        for clz in (User, School, Matchup, Week, Bet, Picks):
            self.response.write('Clearing %s\n' % (clz.__name__))

            for inst in clz.query().fetch():
                inst.key.delete()

            time.sleep(1)
        
        with open('bootstrap.json', 'r') as fp:
            data = json.loads(fp.read())

        users = {}
        for user in data['user']:
            self.response.write('User ' + user['name'] + '\n')
            u = deserializeUser(None, user)
            u.put()
            users[user['id']] = u

        time.sleep(1)

        schools = {}
        for school in data['school']:
            s = deserializeSchool(None, school)
            s.put()
            schools[school['id']] = s

        time.sleep(1)

        matchups = {}
        for m in data['matchup']:
            matchup = Matchup(away_team = schools[m['awayTeam']].key,
                              home_team = schools[m['homeTeam']].key,
                              kickoff_time = parse_time(m['kickoff']),
                              line = m['line'],
                              away_score = m['awayScore'],
                              home_score = m['homeScore'])
            matchup.put()
            matchups[m['id']] = matchup
            
        time.sleep(1)
        
        for w in data['week']:
            week = Week(matchups = [matchups[m].key for m in w['matchups']],
                        active_users = [u.key for u in users.values()],
                        start_date = datetime.datetime.strptime(w['startDate'], '%Y-%m-%d'),
                        end_date = datetime.datetime.strptime(w['endDate'], '%Y-%m-%d'),
                        season = w['season'], number = w['number'],
                        deadline = parse_time(w['deadline']))
            week.put()

        time.sleep(1)

        for p in data['pick']:
            user = users[p['user']]
            for b in p['bets']:
                matchup = matchups[b['matchup']]
                week = Week.query(Week.matchups.IN([matchup.key])).get()
                
                bet = Bet(winner = schools[b['winner']].key,
                          points = b['points'],
                          time_placed = datetime.datetime.now())

                pick = Picks(week = week.key, user = user.key,
                             matchup = matchup.key, bets = [bet])
                pick.put()
            

class Bet(ndb.Model):
    winner = ndb.KeyProperty(kind=School)
    points = ndb.IntegerProperty()
    time_placed = ndb.DateTimeProperty()

class Picks(ndb.Model):
    week = ndb.KeyProperty(kind=Week)
    user = ndb.KeyProperty(kind=User)
    matchup = ndb.KeyProperty(kind=Matchup)
    bets = ndb.StructuredProperty(Bet, repeated=True)
            
            
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
        new = Matchup(home_team=home, away_team=away, line=line, kickoff_time=kickoff,
                      home_score=0, away_score=0)
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

        if '/index' in self.request.path_url:
            return self.index()

        if 'week_id' in kwargs:
            week_id = long(kwargs['week_id'])
            week = Week.get_by_id(week_id)
            out = {}
            out['week'] = serializeEditableWeek(out, week)
            self.response.write(json.dumps(out))
            return

        query = None
        if 'season' in self.request.GET:
            query = Week.season == str(self.request.GET['season'])

        query = Week.query(query) if query is not None else Week.query()
            
        out = {}
        out['week'] = [serializeEditableWeek(out, w) for w in query.fetch()]
        self.response.write(json.dumps(out))

    def index(self):
        search = { 'season': self.request.get('season') }
        for k in search.keys():
            if len(search[k]) == 0: del search[k]

        out = { 'week': WeeksHandler.indexSearch(search) }
        self.response.write(json.dumps(out))

    @classmethod
    def indexSearch(cls, search):
        q = Week.query().order(-Week.season, Week.number)

        today = datetime.date.today()
        if 'season' in search:
            q = q.filter(Week.season == str(search['season']))

        out = []
        for week in q.fetch():
            if week.start_date > today: break
            w = { 'id': week.key.id(), 'season': week.season, 'number': week.number }
            out.append(w)

        return out
        
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
        week.active_users = [ndb.Key(User, long(uid)) for uid in data['users']]
        
        matchups = [ndb.Key('Matchup', long(m)) for m in data['matchups']]
        week.matchups = matchups

        week.put()

        out = {}
        out['week'] = serializeEditableWeek(out, week)
        self.response.write(json.dumps(out))

class PicksHandler(BaseHandler):
    def past_deadline(self, week):
        return True
        return datetime.datetime.now() >= week.deadline

    def requires_user(self):
        return ['PUT']

    def get(self, **kwargs):
        self.response.headers['Content-Type'] = 'application/json'

        if 'week_id' in kwargs:
            week = Week.get_by_id(long(kwargs['week_id']))
        elif '/current' in self.request.path_url:
            week = self.get_current_week()
        else:
            return

        if week is None:
            self.response.status = 404
            return

        editable = not self.past_deadline(week)
        picks = {}
        out = { 'picks': picks }

        picks['id'] = week.key.id()
        picks['editable'] = editable
        picks['users'] = []
        picks['matchups'] = []
        picks['bets'] = []
        picks['weekNumber'] = week.number
        picks['weekSeason'] = week.season
        picks['weekStart'] = format_time(week.start_date)
        picks['weekEnd'] = format_time(week.end_date)

        current_user = User.query(User.name == 'Keith').get()
        
        for u in week.active_users:
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
        today = datetime.date.today()
        q = Week.query().order(-Week.season, -Week.number)
        for week in q.fetch(20):
            if week.start_date <= today:
                return week

        return None

    def validate(self, week, bets):
        matchups = dict((m.key.id(), m) for m in week.matchups)
            
        for bet in bets:
            if long(bet['user']) != self.current_user.key.id() and not self.current_user.admin:
                logging.warn("Unauthorized attempt by %s to modify %s's scores" % \
                             (self.current_user.name, bad.name))
                self.write_error(403, "Forbidden")
                return False
                
            if long(bet['matchup']) not in matchups:
                self.write_error(422, "Matchup not in week")
                return False

            winner = ndb.Key(School, long(bet['winner']))
            matchup = matchups[long(bet['matchup'])]
            if winner not in [matchup.away_team, matchup.home_team]:
                self.write_error(422, 'Invalid winner for matchup')
                return False

            try:
                points = int(bet['points'])
                if points < 0 or points > 100:
                    self.write_error(422, 'All bets must be between 0 and 100')
                    return False
            except ValueError:
                self.write_error(422, 'All bets must be integers between 0 and 100')
                return False
                
        return True

    def put(self, week_id):
        self.response.headers['Content-Type'] = 'application/json'
        data = json.loads(self.request.body)['pick']
            
        week = Week.get_by_id(long(week_id))
        if week is None:
            self.write_error(404, 'Invalid week id')
            return
        
        if self.past_deadline(week) and not self.current_user.admin:
            self.write_error(403, 'Cannot submit picks past the deadline')
            return
                
        for bet in data['bets']:
            user = ndb.Key(User, long(bet['user']))
            matchup = ndb.Key(Matchup, long(bet['matchup']))
            winner = ndb.Key(School, long(bet['winner']))
            points = int(bet['points'])

            picksQ = Picks.query(ndb.AND(Picks.matchup == matchup,
                                         Picks.user == user))
            picks = picksQ.get()
            if picks is None:
                picks = Picks(week = week.key, user = user,
                              matchup = matchup, bets = [])
            else:
                old = picks.bets[-1]
                if old.winner == winner and old.points == points:
                    continue

            logging.info('New pick %i for %s for %s' % (points, user.get().name, winner.get().name))
                    
            betRecord = Bet(winner = winner, points = points,
                            time_placed = datetime.datetime.now())

            picks.bets.append(betRecord)
            picks.put()

        self.response.status = 200
        self.response.write('{}')

class AuthHandler(BaseHandler):
    def get(self, **kwargs):
        self.response.headers['Content-Type'] = 'application/json'

        if '/current' in self.request.path_url:
            return self.get_current()

    def get_current(self):
        current = { 'season': None, 'week': None }
        out = { 'user': None, 'current': current }

        if 'user' in self.session and 'week' in self.session:
            user = User.get_by_id(long(self.session['user']))
            if user is not None: serialize(out, user)

        weeks = WeeksHandler.indexSearch({})

        season = ''
        number = 0
        now = datetime.date.today()
        q = Week.query().order(-Week.season, -Week.number)

        for week in weeks:
            if len(season) == 0: season = week['season']
            if week['season'] != season: break

            number = week['number']
            break    

        current['season'] = season
        current['week'] = number
        out['week'] = filter(lambda w: w['season'] == season, weeks)

        self.response.write(json.dumps(out))
            
    def post(self):
        self.response.headers['Content-Type'] = 'application/json'

        if '/logout' in self.request.path_url:
            self.session.clear()
            self.response.write('{}')
            return

        encoded = self.request.get('token').encode('ascii')
        encrypted = base64.urlsafe_b64decode(encoded)
        nonce = encrypted[-16:]
        encrypted = encrypted[:-16]

        cipher = AES.new(KEY, AES.MODE_CFB, nonce)
        packed = cipher.decrypt(encrypted)

        (user_id, week_id, exp) = struct.unpack('!QQi', packed)

        user = User.get_by_id(user_id)
        week = Week.get_by_id(week_id)

        if user is None or week is None:
            self.response.status = 400
            self.response.write('Invalid login URL.')
            return

        expiration = datetime.datetime.now() + datetime.timedelta(days=4)

        self.session.clear()
        self.session['user'] = user_id
        self.session['week'] = week_id
        self.session['admin'] = user.admin

        self.response.write(json.dumps(serialize({}, user)))

class TokensHandler(webapp2.RequestHandler):
    def get(self, week_id):
        self.response.headers['Content-Type'] = 'application/json'
        week = Week.get_by_id(long(week_id))

        tokens = []
        for user in week.active_users:
            nonce = Random.new().read(16)
            packed = struct.pack('!QQi', user.id(), week.key.id(), 0)

            cipher = AES.new(KEY, AES.MODE_CFB, nonce)
            encrypted = cipher.encrypt(packed) + nonce
            encoded = base64.urlsafe_b64encode(encrypted)
            tokens.append({'user': user.id(), 'token': encoded})

        self.response.write(json.dumps(tokens))

config = {}
config['webapp2_extras.sessions'] = {
    'secret_key': 'my-super-secret-key',
}

app = webapp2.WSGIApplication([
    webapp2.Route(r'/', MainHandler),
    webapp2.Route(r'/api/login', AuthHandler),
    webapp2.Route(r'/api/logout', AuthHandler),
    webapp2.Route(r'/api/current', AuthHandler),
    webapp2.Route(r'/api/tokens/<week_id:\d+>', TokensHandler),
    webapp2.Route(r'/api/users', UsersHandler),
    webapp2.Route(r'/api/users/<user_id:\d+>', UsersHandler),
    webapp2.Route(r'/api/picks', PicksHandler),
    webapp2.Route(r'/api/picks/current', PicksHandler),
    webapp2.Route(r'/api/picks/<week_id:\d+>', PicksHandler),
    webapp2.Route(r'/api/weeks', WeeksHandler),
    webapp2.Route(r'/api/weeks/index', WeeksHandler),
    webapp2.Route(r'/api/weeks/<week_id:\d+>', WeeksHandler),
    webapp2.Route(r'/api/schools', SchoolHandler),
    webapp2.Route(r'/api/schools/<school_id:\d+>', SchoolHandler),
    webapp2.Route(r'/api/matchups', MatchupHandler),
    webapp2.Route(r'/api/matchups/<matchup_id:\d+>', MatchupHandler),
    webapp2.Route(r'/api/reload', ReloadHandler),
], config=config, debug=True)
