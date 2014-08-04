#!/usr/bin/env python

import json, datetime
import webapp2
from google.appengine.ext import ndb

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

class Week(ndb.Model):
    active_users = ndb.KeyProperty(kind=Person, repeated=True)
    matchups = ndb.KeyProperty(kind=Matchup, repeated=True)
    start_date = ndb.DateTimeProperty()
    end_date = ndb.DateTimeProperty()
    number = ndb.IntegerProperty()
    deadline = ndb.DateTimeProperty()

class Bet(ndb.Model):
    person = ndb.KeyProperty(kind=Person)
    matchup = ndb.KeyProperty(kind=Matchup)
    winner = ndb.KeyProperty(kind=School)
    points = ndb.IntegerProperty()
    number = ndb.IntegerProperty()
    time_placed = ndb.DateTimeProperty()    

class MainHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write('Hello world!')

class SchoolHandler(webapp2.RequestHandler):
    def get(self):
        schools = [serializeSchool(s) for s in School.query().fetch()]
        out = { "school": schools }
        self.response.write(json.dumps(out))

    def get(self, school_id):
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

class BetHandler(webapp2.RequestHandler):
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
        users = set()
        
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

app = webapp2.WSGIApplication([
    webapp2.Route(r'/', MainHandler),
    webapp2.Route(r'/weeks/<week_id:\d+>', WeekHandler),
    webapp2.Route(r'/bets', BetHandler),
    webapp2.Route(r'/schools', SchoolHandler),
    webapp2.Route(r'/schools/<school_id:\d+>', SchoolHandler),
], debug=True)
