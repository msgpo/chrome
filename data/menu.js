var app		=	chrome.extension.getBackgroundPage();
var port	=	chrome.runtime.connect({name: 'panel'});	// knock knock

var menu	=	{
	in_menu: true,

	get_el: function()
	{
		return document.getElement('ul.app-menu');
	},

	close: function()
	{
		window.close();
	},

	reset_height: function()
	{
		// reset the box height
		document.body.getParent().setStyle('height', 1);
		(function() {
			document.body.getParent().setStyle('height', '');
		}).delay(10, this);
	},

	show_panel: function(options)
	{
		options || (options = {});

		var menu_ul	=	menu.get_el();
		var rsagen	=	document.body.getElement('.rsa-gen');
		var wrapper	=	$('wrap-modal');
		if(menu_ul) menu_ul.setStyle('display', 'none');
		if(rsagen) rsagen.setStyle('display', 'none');
		if(wrapper) wrapper.setStyle('display', 'block');

		if(options.width) document.body.setStyle('width', options.width);

		menu.reset_height();
		menu.in_menu	=	false;
	},

	show_menu: function()
	{
		var menu_ul	=	menu.get_el();
		var wrapper	=	$('wrap-modal');
		if(menu_ul) menu_ul.setStyle('display', '');
		if(wrapper) wrapper.setStyle('display', '');

		document.body.setStyle('width', '');

		menu.reset_height();
		menu.in_menu	=	true;
	},

	dispatch: function(url)
	{
		var bg_inject	=	$('background_content');
		var body		=	document.body;
		switch(url)
		{
		case 'app':
			app.ext.open_app();
			menu.close();
			break;
		case 'bookmark':
			menu.show_panel();
			app.ext.bookmark.open(body, bg_inject);
			break;
		case 'add-note':
			menu.show_panel();
			// note: need to figure out board selector
			app.ext.panel.open(body, 'NoteEditController', {
				inject: bg_inject,
				edit_in_modal: false
			}, {width: 750});
			break;
		case 'personas':
			menu.show_panel();
			app.ext.personas.open(body, bg_inject);
			break;
		case 'personas-join':
			menu.show_panel();
			app.ext.personas.open(body, bg_inject, {join: true, add: true});
			break;
		case 'invites':
			menu.show_panel();
			app.ext.invites.open(body, bg_inject);
			break;
		case 'logout':
			app.turtl.user.logout();
			menu.close();
			break;
		}
	}
};

window.addEvent('domready', function() {
	var menu_ul	=	menu.get_el();
	if(!menu_ul) return false;

	// give ourselves a working barfr (by hijacking the background app's barfr)
	app.barfr	=	new app.Barfr('barfr', {});
	app.barfr.objects.container.dispose().inject(document.body, 'bottom');

	// bind our menu items to the dispatch function LOLOLOL
	menu_ul.addEvent('click:relay(a)', function(e) {
		if(e) e.stop();
		if(!e.target) return false;
		var href	=	e.target.href.replace(/^.*#/, '');
		menu.dispatch(href);
	});

	// make sure menu is the right size on load
	menu.reset_height();

	// resize the panel when a main page controller is released
	app.turtl.controllers.pages.bind('release-current', function() {
		menu.show_pane();
	});

	if(window.location.hash.toString() != '')
	{
		menu.dispatch(window.location.hash.replace(/^#/, ''));
	}

	// update invite/message count (they are folded together for now)
	var num_invites		=	app.ext.invites.num_pending();
	var num_messages	=	app.ext.messages.num_pending();
	var num_total		=	num_invites + num_messages;
	if(num_total > 0)
	{
		var atag	=	menu_ul.getElement('a.invites');
		atag.set('html', atag.get('html') + ' ('+ num_total +')');
		atag.setStyle('font-weight', 'bold');
	}
});

