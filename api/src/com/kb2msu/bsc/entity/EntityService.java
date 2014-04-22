package com.kb2msu.bsc.entity;

import com.googlecode.objectify.Objectify;
import com.googlecode.objectify.ObjectifyFactory;
import com.googlecode.objectify.ObjectifyService;

public class EntityService {
	static {
		factory().register(School.class);
		factory().register(Matchup.class);
		factory().register(Week.class);
		factory().register(User.class);
		factory().register(Bet.class);
	}

	public static Objectify ofy() {
		return ObjectifyService.ofy();
	}

	public static ObjectifyFactory factory() {
		return ObjectifyService.factory();
	}
}
