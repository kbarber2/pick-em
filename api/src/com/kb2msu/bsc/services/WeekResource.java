package com.kb2msu.bsc.services;

import java.lang.reflect.Type;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;
import com.googlecode.objectify.Key;
import com.googlecode.objectify.Objectify;
import com.kb2msu.bsc.entity.EntityService;
import com.kb2msu.bsc.entity.Week;

@Path("week")
public class WeekResource {
	public WeekResource() {
		mData = EntityService.ofy();
		mBuilder = new GsonBuilder().registerTypeAdapter(
				Week.class, new Serializer());
	}

	@GET
	@Produces(MediaType.APPLICATION_JSON)
	public String getAllWeeks() {
		return "[{}]";
	}

	@GET @Path("{id}")
	@Produces(MediaType.APPLICATION_JSON)
	public String getWeek(@PathParam("id") int id) {
		Week week = mData.load().type(Week.class).filterKey(
				Key.create(Week.class, "2013-12")).first().now();
		Gson gson = mBuilder.create();
		return gson.toJson(week);
	}

	public static class Serializer implements JsonSerializer<Week> {
		@Override
		public JsonElement serialize(Week src, Type typeOfSrc,
				JsonSerializationContext context) {
			JsonObject obj = new JsonObject();
			obj.addProperty("number", src.number);
			obj.addProperty("year", src.season);
			return obj;
		}

	}

	private final Objectify mData;
	private final GsonBuilder mBuilder;
}
