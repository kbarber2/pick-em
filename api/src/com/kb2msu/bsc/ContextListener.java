package com.kb2msu.bsc;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

import com.googlecode.objectify.Objectify;
import com.kb2msu.bsc.entity.EntityService;

public class ContextListener implements ServletContextListener {
	@Override
	public void contextDestroyed(ServletContextEvent event) {

	}

	@Override
	public void contextInitialized(ServletContextEvent event) {
		Objectify ofy = EntityService.ofy();
		StaticData.load(ofy, event.getServletContext());
	}
}
