package com.kb2msu.bsc.entity;

import java.util.ArrayList;
import java.util.List;

import com.googlecode.objectify.Ref;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class Week {
	public int getSeason() {
		return season;
	}

	public void setSeason(int season) {
		this.season = season;
	}

	public int getNumber() {
		return number;
	}

	public void setNumber(int number) {
		this.number = number;
	}

	public Matchup[] getMatchups() {
		Matchup[] m = new Matchup[matchups.size()];
		for (int i = 0; i < matchups.size(); i++)
			m[i] = matchups.get(i).get();
		return m;
	}

	public void setMatchups(Matchup[] matchups) {
		this.matchups.clear();

		for (Matchup m : matchups)
			this.matchups.add(Ref.create(m));
	}

	public User[] getActiveUsers() {
		User[] u = new User[activeUsers.size()];
		for (int i = 0; i < activeUsers.size(); i++)
			u[i] = activeUsers.get(i).get();
		return u;
	}

	public Week() {

	}

	@Id private Long id;
	public int season;
	public int number;
	public List<Ref<Matchup>> matchups = new ArrayList<>();
	public List<Ref<User>> activeUsers = new ArrayList<>();
}
