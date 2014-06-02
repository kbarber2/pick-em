package com.kb2msu.bsc.entity;

import com.googlecode.objectify.Ref;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class Bet {
	public long getID() {
		return id;
	}

	public Ref<User> getUser() {
		return user;
	}

	public void setUser(User user) {
		this.user = Ref.create(user);
	}

	public Matchup getMatchup() {
		return matchup.get();
	}

	public void setMatchup(Matchup matchup) {
		this.matchup = Ref.create(matchup);
	}

	public School getWinner() {
		return winner.get();
	}

	public void setWinner(School winner) {
		this.winner = Ref.create(winner);
	}

	public int getPoints() {
		return points;
	}

	public void setPoints(int points) {
		this.points = points;
	}

	public Bet() {
	}

	@Id private Long id;
	public Ref<User> user;
	public Ref<Matchup> matchup;
	public Ref<School> winner;
	public int points;
}
