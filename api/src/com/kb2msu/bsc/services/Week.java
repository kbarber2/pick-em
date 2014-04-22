package com.kb2msu.bsc.services;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Path("week")
public class Week {
	public Week() {
	}

	@GET
	@Produces(MediaType.APPLICATION_JSON)
	public String getAllWeeks() {
		return "[{}]";
	}
}
