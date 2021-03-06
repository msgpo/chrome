// note that we're already in the background page scope here, but I'd like to
// not rely on that fact
var app			=	chrome.extension.getBackgroundPage();
var comm		=	new Comm();
var just_joined	=	false;	// used to track joins (data/user.js)

/**
 * This is the main extension object. Not only does it hold a number of function
 * and data to make the addon work, it's also the scope the other pieces of the
 * addon load themselves into. This gives the extension a single namespace for
 * all its libraries.
 */
var ext	=	{
	// holds "install" "upgrade" "downgrade" "open"
	load_reason: false,

	// tracks all open Turtl tabs
	app_tabs: [],

	// holds the tab object of the last tab opened
	last_opened_tab: false,

	/**
	 * Called on extension init. Initializes any listeners for the "clean slate"
	 * addon state.
	 */
	setup: function()
	{
		// remove all events
		comm.unbind();

		ext.invites.init();
		ext.messages.init();
		ext.personas.init();

		// bind to login/logout
		app.turtl.user.bind('login', function() {
			ext.do_login({join: just_joined});
			just_joined	=	false;
		});
		app.turtl.user.bind('logout', ext.do_logout);

		// sometimes we want to open the personas dialogue from within the app
		comm.bind('personas-add-open', function() {
			var container	=	ext.panel.last_container;
			var inject		=	ext.panel.last_inject;
			ext.panel.release();
			ext.personas.open(container, inject, {add: true});
		});

		// when we get a resize event from a panel controller, tell the panel
		// to resize
		comm.bind('resize', function() {
			ext.panel.reset_height();
		});

		// when the main panel (ext popup) closes, release the controller loaded
		// in the panel (if one exists)
		comm.bind('panel-close', function() {
			ext.panel.release();
			comm.unbind_context('panel');
		});

		// listen for new messages/notifications
		comm.bind('num-messages', function() {
			// messages are folded into invites for now
			ext.invites.notify();
		});

		// listen for changes in invite/message data
		comm.bind('invites-change', function() {
			ext.update_badge();
		});
	},

	/**
	 * Called when we wish to open the Turtl app in a tab. If turtl already
	 * exists in a tab in this window, we activate that tab (instead of opening
	 * a new one). IF there's no Turtl app tab opened in this window, we open
	 * one and set up event handling for it.
	 */
	open_app: function()
	{
		// get the current window (async)
		chrome.windows.getLastFocused(function(win) {
			// check if this window has an app tab already
			var window_id	=	win.id;
			chrome.tabs.query({windowId: window_id}, function(tabs) {
				var tab	=	tabs.filter(function(t) {
					return t.url.match(chrome.extension.getURL('/'));
				});
				if(tab[0])
				{
					// found a tab! select the first one
					chrome.tabs.update(tab[0].id, {selected: true});
					return true;
				}

				// no app tab for this window! create one.
				chrome.tabs.create({
					url: chrome.extension.getURL('/data/index.html'),
				}, function(tab) {
					// set up a PERSONALIZED comm for this tab, allowing it to pass
					// its own events around without muddying up our global comm
					// object
					tab.comm	=	new Comm();
					ext.setup_tab(tab);

					// track the tab/window pair
					ext.app_tabs.push(tab);

					// track last opened tab so it can grab its own comm object from
					// ext once it runs its setup. bit of a hack, but hoesntly works
					// 10x better than trying to pull out the window object via
					// ext.getViews() and trying to time the injection right. ugh.
					ext.last_opened_tab	=	tab;
				});
			});
		});
	},

	close_app_tab: function(tab_id, options)
	{
		options || (options = {});

		// close the tab if needed
		if(options.do_close) chrome.tabs.remove(tab_id);

		ext.app_tabs	=	ext.app_tabs.filter(function(tab) {
			// if the tab is being removed, unbind its comm object
			if(tab.id == tab_id)
			{
				console.log('tab: '+ tab_id +': unbind comm');
				tab.comm.unbind();
				tab.comm	=	false;
				comm.unbind_context(tab);
			}
			return !(tab.id == tab_id);
		});
	},

	/**
	 * Set up event listening/forwarding for a newly opened app tab. Mainly what
	 * we do here is wire up events between the new tab's port (tabcomm) and the
	 * global/background port (comm).
	 */
	setup_tab: function(tab)
	{
		// forward some background comm events to this tab's comm. note that we
		// pass the tab object as the binding context (useful for unbinding all
		// the tab's events later on)
		tab.comm.bind('logout', function() {
			app.turtl.user.logout();
		});
		tab.comm.bind('personas-add-open', function() { comm.trigger('personas-add-open'); });
		tab.comm.bind('tab-unload', function() {
			// we wait here because this may have been initiated from a tab
			// close, in which case we don't actually want to do anything.
			if(!tab.comm) return false;
			(function() {
				chrome.tabs.get(tab.id, function(query_tab) {
					if(!tab.comm) return false;
					if(!query_tab.url.match(chrome.extension.getURL('/')))
					{
						// tab URL changed! unbind the comm/untrack tab
						ext.close_app_tab(tab.id);
					}
					else
					{
						// tab was reloaded, need to re-setup comm
						console.log('open tab');
						ext.close_app_tab(tab.id, {do_close: true});
						ext.open_app.delay(100, this);
					}
				});
			}).delay(10, this);
		});
	},

	/**
	 * Set a loading gif icon into the browser action icon. Doesn't work because
	 * the chrome devs don't want to support gif icons. Fair enough.
	 */
	loading: function(yesno)
	{
		yesno || (yesno = false);
		if(yesno)
		{
			chrome.browserAction.setIcon({
				path: '/data/app/images/site/icons/load_16x16.gif'
			});
		}
		else
		{
			chrome.browserAction.setIcon({
				path: '/data/app/images/favicon.19.png'
			});
		}
	},

	/**
	 * Called when a user logs in (via the ext login popup).
	 */
	do_login: function(options)
	{
		options || (options = {});

		ext.loading(true);
		chrome.browserAction.disable();
		comm.bind('profile-load-complete', function() {
			ext.loading(false);
			comm.unbind('profile-load-complete', arguments.callee);
			chrome.browserAction.enable();
			chrome.browserAction.setPopup({popup: '/data/menu.html'});

			var login_finish	=	function()
			{
				// update invites/badge
				ext.invites.notify();
				ext.update_badge();
			};

			if(options.join)
			{
				// if we're here, the personas dialog is already showing. wait
				// for it to close then finish logging in
				comm.bind('panel-close', function() {
					comm.unbind('panel-close', arguments.callee);
					login_finish();
					// open the app once we're done
					ext.open_app();
				});
			}
			else
			{
				login_finish();
			}
		});
	},

	/**
	 * Called when a user logs out of Turtl
	 */
	do_logout: function(options)
	{
		options || (options = {});

		// close all app tabs
		chrome.tabs.remove(ext.app_tabs.map(function(tab) { return tab.id; }));

		chrome.browserAction.setPopup({popup: '/data/user.html'});
		chrome.browserAction.setIcon({
			path: '/data/app/images/favicon.19.gray.png'
		});

		ext.update_badge();

		// run setup again
		if(!options.skip_setup) ext.setup();
	},

	update_badge: function()
	{
		var badge	=	'';
		if(app.turtl.user && app.turtl.user.logged_in && app.turtl.user.get('personas').models().length > 0)
		{
			badge	=	ext.invites.num_pending() + ext.messages.num_pending();
			badge	=	badge.toString();
		}
		if(badge == '0') badge = '';
		chrome.browserAction.setBadgeText({text: badge});
	},

	// NOTE: other libs (bookmark, personas, etc) will add their own objects
	// into the `ext` namespace
};

// listen for tab closes and update our app tab list as needed
chrome.tabs.onRemoved.addListener(function(tab_id, info) {
	ext.close_app_tab(tab_id);
});

// listen for commands!
chrome.commands.onCommand.addListener(function(cmd) {
	switch(cmd)
	{
	case 'open':
		if(app.turtl.user.logged_in) ext.open_app();
		break;
	case 'logout':
		app.turtl.user.logout();
		break;
	}
});

// set up the app once all the background stuff is done loading
comm.bind('loaded', function() {
	ext.setup();
});

// this sets up the main menu
ext.do_logout({skip_setup: true});

// determine what kind of run we're doing
var cur_version		=	chrome.app.getDetails().version;
if(!localStorage.version)
{
	ext.load_reason	=	'install';
}
else
{
	var last_version	=	localStorage.version;
	var comp			=	compare_versions(cur_version, last_version);
	if(comp > 0) ext.load_reason = 'upgrade';
	if(comp < 0) ext.load_reason = 'downgrade';
	if(comp == 0) ext.load_reason = 'open';
}
console.log('load reason: ', ext.load_reason);
localStorage.version	=	cur_version;

