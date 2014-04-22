package com.kb2msu.bsc.entity;

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class School {
	public School() {
		
	}

	@Id public String longName;
	public String name;
	public String abbreviation;
	public String mascot;
	public String primaryColor;
	public String secondaryColor;
}
