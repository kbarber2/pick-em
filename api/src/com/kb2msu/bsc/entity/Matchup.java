package com.kb2msu.bsc.entity;

import java.util.Date;

import com.googlecode.objectify.Ref;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class Matchup {
	public Matchup() {
	}
	
	public long getID() {
		return id;
	}

	@Id private Long id;
	public Date kickoffTime;
	public Ref<School> awayTeam;
	public Ref<School> homeTeam;
	public int line;
}
