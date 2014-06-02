package com.kb2msu.bsc.services;

import java.util.List;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.googlecode.objectify.Key;
import com.googlecode.objectify.Objectify;
import com.kb2msu.bsc.entity.Bet;
import com.kb2msu.bsc.entity.EntityService;
import com.kb2msu.bsc.entity.Matchup;
import com.kb2msu.bsc.entity.User;
import com.kb2msu.bsc.entity.Week;

@Path("week")
public class WeekResource {
	public WeekResource() {
		mData = EntityService.ofy();
	}

	@GET
	@Produces(MediaType.APPLICATION_JSON)
	public String getCurrentWeek() {
		Week week = mData.load().type(Week.class).first().now();
		return mGson.toJson(serialize(week));
	}

	@GET @Path("{id}")
	@Produces(MediaType.APPLICATION_JSON)
	public String getWeek(@PathParam("id") int id) {
		Week week = mData.load().key(Key.create(Week.class, id)).now();
		return mGson.toJson(serialize(week));
	}

	private JsonObject serialize(Week week) {
		JsonObject obj = new JsonObject();
		obj.addProperty("number", week.number);
		obj.addProperty("year", week.season);

		JsonArray array = new JsonArray();
		obj.add("users", array);
		for (User user : week.getActiveUsers()) {
			array.add(new JsonPrimitive(user.getID()));
		}

		array = new JsonArray();
		obj.add("matchups", array);
		for (Matchup m : week.getMatchups()) {
			array.add(new JsonPrimitive(m.getID()));
		}

		List<Bet> bets = mData.load().type(Bet.class).filter(
			"matchup in", week.matchups).list();

		array = new JsonArray();
		obj.add("bets", array);
		for (Bet b : bets) {
			array.add(new JsonPrimitive(b.getID()));
		}

		return obj;
	}

	private final Objectify mData;
	private final Gson mGson = new Gson();
}
