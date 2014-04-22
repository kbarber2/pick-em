package com.kb2msu.bsc.entity;

import java.util.UUID;

import com.googlecode.objectify.Ref;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class Bet {
	public Bet() {
		id = UUID.randomUUID().toString();
	}

	@Id private final String id;
	public Ref<User> user;
	public Ref<Matchup> matchup;
	public Ref<School> winner;
	public int points;
}
