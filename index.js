//ngrok start --all -config ~/repos/SongCast/ngrok.yml
var express  	= require('express');
var alexa 		= require('alexa-app');
var Spotify		= require('./spotify');
var Cast		= require('./cast');

var alexaApp = new alexa.app('SongCast');
var app = express();
var spotify = new Spotify();

alexaApp.express({
	expressApp: app,
	router: express.Router(),
	checkCert: true,
	debug: true
});

alexaApp.launch(function (req, res) {
	var prompt = 'I can cast Spotify tracks, albums, artists and playlists to all your Chromecast devices.';
	res.say(prompt);
});

alexaApp.intent('PlayTrackIntent', {
		'slots': {
			'track': 'AMAZON.MusicRecording',
			'artist': 'AMAZON.MusicGroup',
			'device': 'AMAZON.LITERAL'
		},
		'utterances': ['Play {-|track} by {-|artist} on {-|device}']
	},
	function (request, response) {
		spotify.search(request.slot('artist'), request.slot('track'))
		.then(function(url) {
			var cast = new Cast({ device: request.slot('device'), type: 'track', url: url, title: request.slot('track') });
			response.say('Now playing ' + request.slot('track') + ' by ' + request.slot('artist')).shouldEndSession(false).send();
		})
		.catch(function(e) {
			response.say(e.message).shouldEndSession(false).send();
		});

		return false;
	}
);

app.listen(3000);

module.exports = alexaApp;