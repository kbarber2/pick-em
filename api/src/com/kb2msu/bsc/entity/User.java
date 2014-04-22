package com.kb2msu.bsc.entity;

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;

@Entity
public class User {
	public User() {

	}

	@Id public String username;
	public String name;
	public int order;
}
