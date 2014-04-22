package com.kb2msu.bsc.entity;

import com.googlecode.objectify.Ref;
import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class Week {
	public Week() {

	}

	public void setID() {
		id = String.format("%d-%d", season, number);
	}

	@Id private String id;
	public int season;
	public int number;
	public Ref<Matchup>[] matchups;
}
