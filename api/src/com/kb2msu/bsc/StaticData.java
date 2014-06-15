package com.kb2msu.bsc;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.URL;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.servlet.ServletContext;

import com.google.gson.Gson;
import com.googlecode.objectify.Key;
import com.googlecode.objectify.Objectify;
import com.kb2msu.bsc.entity.Bet;
import com.kb2msu.bsc.entity.Matchup;
import com.kb2msu.bsc.entity.School;
import com.kb2msu.bsc.entity.User;
import com.kb2msu.bsc.entity.Week;

public class StaticData {
	public static boolean load(Objectify ofy, ServletContext ctx) {
		try {
			loadSchools(ofy, ctx);
			loadWeeks(ofy);
			loadMatchups(ofy);
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
			schools.put(s.getAbbreviation(), s);
		}
		reader.close();
	}

	@SuppressWarnings("deprecation")
	private static void loadMatchups(Objectify ofy) {
		int year = 2013;

		Week w1 = null, w2 = null;
		for (Week w : ofy.load().type(Week.class).list()) {
			if (w.getNumber() == 12) w1 = w;
			else if (w.getNumber() == 13) w2 = w;
		}

		Matchup[] matchups = new Matchup[] {
				matchup(w2, new Date(year - 1900, 11, 23, 15, 30, 0), "MSU", "NW", 75),
				matchup(w2, new Date(year - 1900, 11, 23, 12, 0, 0), "Illinois", "Purdue", 65),
				matchup(w2, new Date(year - 1900, 11, 23, 20, 0, 0), "UMich", "Iowa", -65),
				matchup(w1, new Date(year - 1900, 11, 16, 12, 0, 0), "IU", "WI", -205),
				matchup(w1, new Date(year - 1900, 11, 16, 15, 30, 0), "OSU", "Illinois", 325),
		};

		ofy.save().entities(matchups).now();
	}

	@SuppressWarnings({ "deprecation" })
	private static void loadWeeks(Objectify ofy) {
		Week w = new Week();
		w.setSeason(2013);
		w.setNumber(12);

		List<Matchup> matchups = ofy.load().type(Matchup.class).list();
		Date date = new Date(2013 - 1900, 11, 17);
		List<Matchup> matches = new LinkedList<>();

		for (Matchup m : matchups) {
			if (m.getKickoff().before(date))
				matches.add(m);
		}

		ofy.save().entities(w).now();
		matchups.removeAll(matches);

		w = new Week();
		w.setSeason(2013);
		w.setNumber(13);

		ofy.save().entities(w).now();
	}

	private static void loadUsers(Objectify ofy) {
		User u1 = new User();
		u1.setUserName("kbarber2");
		u1.setName("Keith");
		u1.setOrder(1);

		User u2 = new User();
		u2.setUserName("frank");
		u2.setName("Frank");
		u2.setOrder(3);

		User u3 = new User();
		u3.setUserName("aaron");
		u3.setName("Aaron");
		u3.setOrder(2);

		ofy.save().entities(u1, u2, u3).now();
	}

	private static void loadBets(Objectify ofy) {
		Bet b = new Bet();
		b.setPoints(40);
		b.setMatchup(ofy.load().type(Matchup.class).first().now());
		b.setUser(ofy.load().type(User.class).filterKey(
				Key.create(User.class, "kbarber2")).first().now());
		b.setWinner(schools.get("MSU"));

		ofy.save().entities(b).now();
	}

	private static Matchup matchup(Week week, Date kickoff, String away,
		String home, int line) {
		Matchup m = new Matchup();

		m.setWeek(week);
		m.setKickoff(kickoff);
		m.setAwayTeam(schools.get(away));
		m.setHomeTeam(schools.get(home));
		m.setLine(line);
		return m;
	}

	private static final Map<String, School> schools = new HashMap<>();
}
