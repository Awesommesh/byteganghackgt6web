const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const request = require('request'); //For Weather API
const http = require('http');
const url = require('url');
const opn = require('open');
const destroyer = require('server-destroy');
const path = require('path');
var morgan = require('morgan'); 			// log requests to the console (express4)
var bodyParser = require('body-parser'); 	// pull information from HTML POST (express4)
var express  = require('express');
var app      = express(); 								// create our app w/ express
var mongoose = require('mongoose'); 					// mongoose for mongodb
var argv = require('optimist').argv;
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)

mongoose.connect('mongodb://' + argv.be_ip + ':80/my_database');
app.use('/js', express.static(__dirname + '/js'));
app.use(morgan('dev')); 										// log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'})); 			// parse application/x-www-form-urlencoded
app.use(bodyParser.json()); 									// parse application/json
app.use(methodOverride());

var daySched = [];

app.get('/', function(req, res) {
	res.sendfile('main.html'); // load the single view file (angular will handle the page changes on the front-end
	fs.readFile('credentials.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		// Authorize a client with credentials, then call the Google Calendar API.
		authorize(JSON.parse(content), listEvents);
	});
	let apiKey = "46f2b22404f803839b2772708544f597";
	let area = "America";
	let city = "Atlanta";
	let urli = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
	request(urli, function (err, response, body) {
		if(err){
			console.log('error:', error);
		} else {
			console.log('body:', body);
			daySched.push(body);
		}
	});
	city = "New_York";
	urli = `http://worldtimeapi.org/api/timezone/${area}/${city}.txt`;
	request(urli, function (err, response, body) {
		if(err){
			console.log('error:', error);
		} else {
			console.log('body:', body);
			daySched.push(body);
		}
	});
	res.json(daySched);
	daySched = [];
});

app.listen(80, argv.fe_ip);
console.log("App listening on port 80");

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

function authorize(credentials, callback) {
	const {client_secret, client_id, redirect_uris} = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(
		client_id, client_secret, redirect_uris[0]);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getAccessToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		callback(oAuth2Client);
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */

function getAccessToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) return console.error('Error retrieving access token', err);
			oAuth2Client.setCredentials(token);
			// Store the token to disk for later program executions
			fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
				if (err) return console.error(err);
				console.log('Token stored to', TOKEN_PATH);
			});
			callback(oAuth2Client);
		});
	});
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function listEvents(auth) {
	const calendar = google.calendar({version: 'v3', auth});
	calendar.events.list({
		calendarId: 'primary',
		timeMin: (new Date()).toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime',
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);
		const events = res.data.items;
		if (events.length) {
			console.log('Upcoming 10 events:');
			daySched.push('Upcoming 10 events:');
			events.map((event, i) => {
				const start = event.start.dateTime || event.start.date;
				console.log(`${start} - ${event.summary}`);
				daySched.push(`${start} - ${event.summary}`);
			});
		} else {
			console.log('No upcoming events found.');
			daySched.push('No upcoming events found.');
		}
	});
}

