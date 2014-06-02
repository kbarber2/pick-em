package com.kb2msu.bsc;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.URL;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.servlet.ServletContext;

import com.google.gson.Gson;
import com.googlecode.objectify.Key;
import com.googlecode.objectify.Objectify;
import com.googlecode.objectify.Ref;
import com.kb2msu.bsc.entity.Bet;
import com.kb2msu.bsc.entity.Matchup;
import com.kb2msu.bsc.entity.School;
import com.kb2msu.bsc.entity.User;
import com.kb2msu.bsc.entity.Week;

public class StaticData {
	public static boolean load(Objectify ofy, ServletContext ctx) {
		try {
			loadSchools(ofy, ctx);
			loadMatchups(ofy);
			loadWeeks(ofy);
			loadUsers(ofy);
			loadBets(ofy);
			return true;
		} catch (IOException e) {
			e.printStackTrace();
			return false;
		}
	}

	private static void loadSchools(Objectify ofy, ServletContext ctx) throws IOException {
		Gson gson = new Gson();
		URL url = ctx.getResource("/schools.json");
		Reader reader = new InputStreamReader(url.openStream());
		School[] schoolList = gson.fromJson(reader, School[].class);

		for (School s : schoolList) {
			if (s == null) continue;
			ofy.save().entities(s).now();
			schools.put(s.abbreviation, s);
		}
		reader.close();
	}

	@SuppressWarnings("deprecation")
	private static void loadMatchups(Objectify ofy) {
		int year = 2013;

		Matchup[] matchups = new Matchup[] {
				matchup(new Date(year - 1900, 11, 23, 15, 30, 0), "MSU", "NW", 75),
				matchup(new Date(year - 1900, 11, 23, 12, 0, 0), "Illinois", "Purdue", 65),
				matchup(new Date(year - 1900, 11, 23, 20, 0, 0), "UMich", "Iowa", -65),
				matchup(new Date(year - 1900, 11, 16, 12, 0, 0), "IU", "WI", -205),
				matchup(new Date(year - 1900, 11, 16, 15, 30, 0), "OSU", "Illinois", 325),
		};

		ofy.save().entities(matchups).now();
	}

	@SuppressWarnings({ "deprecation" })
	private static void loadWeeks(Objectify ofy) {
		Week w = new Week();
		w.season = 2013;
		w.number = 12;

		List<Matchup> matchups = ofy.load().type(Matchup.class).list();
		Date date = new Date(2013 - 1900, 11, 17);
		List<Matchup> matches = new LinkedList<>();

		for (Matchup m : matchups) {
			if (m.kickoffTime.before(date))
				matches.add(m);
		}

		w.matchups = new ArrayList<Ref<Matchup>>(matches.size());
		for (int i = 0; i < matches.size(); i++) {
			w.matchups.add(Ref.create(matches.get(i)));
		}

		ofy.save().entities(w).now();
		matchups.removeAll(matches);

		w = new Week();
		w.season = 2013;
		w.number = 13;

		w.matchups = new ArrayList<Ref<Matchup>>(matches.size());
		for (int i = 0; i < matches.size(); i++) {
			w.matchups.add(Ref.create(matches.get(i)));
		}

		ofy.save().entities(w).now();
	}

	private static void loadUsers(Objectify ofy) {
		User u1 = new User();
		u1.username = "kbarber2";
		u1.name = "Keith";
		u1.order = 1;

		User u2 = new User();
		u2.username = "frank";
		u2.name = "Frank";
		u2.order = 3;

		User u3 = new User();
		u3.username = "aaron";
		u3.name = "Aaron";
		u3.order = 2;

		ofy.save().entities(u1, u2, u3).now();
	}

	private static void loadBets(Objectify ofy) {
		Bet b = new Bet();
		b.points = 40;
		b.matchup = Ref.create(ofy.load().type(Matchup.class).first().now());
		b.user = Ref.create(ofy.load().type(User.class).filterKey(
				Key.create(User.class, "kbarber2")).first().now());
		b.winner = Ref.create(schools.get("MSU"));

		ofy.save().entities(b).now();
	}

	private static Matchup matchup(Date kickoff, String away, String home, int line) {
		Matchup m = new Matchup();
		m.kickoffTime = kickoff;
		m.awayTeam = Ref.create(schools.get(away));
		m.homeTeam = Ref.create(schools.get(home));
		m.line = line;
		m.setId();
		return m;
	}

	private static final Map<String, School> schools = new HashMap<>();
}
