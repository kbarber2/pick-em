package com.kb2msu.bsc.entity;

import java.text.SimpleDateFormat;
import java.util.Date;

import com.googlecode.objectify.Ref;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class Matchup {
	public Matchup() {
	}

	public void setId() {
		SimpleDateFormat format = new SimpleDateFormat("y-M-d");
		id = String.format("%s %s vs. %s", format.format(kickoffTime),
				awayTeam.get().abbreviation, homeTeam.get().abbreviation);
	}

	@Id public String id;
	public Date kickoffTime;
	public Ref<School> awayTeam;
	public Ref<School> homeTeam;
	public int line;
}
