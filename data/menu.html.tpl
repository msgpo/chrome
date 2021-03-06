<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Type" content="test/html; charset=utf-8">
		<meta http-equiv="Content-Language" content="en">
		<script src="app/library/mootools-core-1.4.5.js"></script>
		<script src="app/library/mootools-more-1.4.0.1.js"></script>
		<script src="menu.js"></script>
		<link rel="stylesheet" href="app/css/reset.css">
		<link rel="stylesheet" href="app/css/template.css">
		<link rel="stylesheet" href="app/css/general.css">
{{gencss}}
		<link rel="stylesheet" href="background.css">
		<link rel="stylesheet" href="menu.css">
		<style type="text/css">
			#wrap-modal {display: none;}
		</style>
	</head>
	<body class="bare">
		<ul class="app-menu">
			<li>
				<a href="#app">
					<img src="app/images/favicon.png" width="16" height="16" alt="">
					Open Turtl
				</a>
			</li>
			<li>
				<a href="#bookmark">
					<img src="app/images/site/icons/bookmark_16x16.png" width="16" height="16" alt="">
					Bookmark this page
				</a>
			</li>
			<!--
			<li>
				<a href="#add-note">
					Add a new note
				</a>
			</li>
			-->
			<li class="div"></li>
			<li>
				<a href="#invites" class="invites">Invites</a>
			</li>
			<li>
				<a href="#personas">Personas</a>
			</li>
			<li class="div"></li>
			<li>
				<a href="#logout">Logout</a>
			</li>
			<!--
			<li>
				<a href="#about">About</a>
			</li>
			-->
		</ul>
		<div class="rsa-gen clear">
			<img src="app/images/site/icons/load_16x16.gif" width="16" height="16" alt="WORKING!!">
			Generating RSA key
			<br><br>
			<input id="notify-rsa" type="checkbox" name="notify-rsa">
			<label for="notify-rsa">Notify me when done</label>
		</div>
		<div id="wrap-modal">
			<div id="wrap">
				<div id="main" class="maincontent">
					<div id="background_content" class="modalcontent clear"></div>
				</div>
			</div>
		</div>
	</body>
</html>

