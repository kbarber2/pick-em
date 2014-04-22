package com.kb2msu.bsc;

import java.io.IOException;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.Path;

import com.googlecode.objectify.Objectify;
import com.kb2msu.bsc.entity.EntityService;

@SuppressWarnings("serial")
@Path("/api")
public class ApiServlet extends HttpServlet {
	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
			throws IOException {
		resp.setContentType("application/json");
	}

	@Override
	public void init() {
		Objectify ofy = EntityService.ofy();
		StaticData.load(ofy, getServletContext());
	}
}
