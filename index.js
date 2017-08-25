var alexa = require('alexa-app');
var Cast = require('./cast');
var express = require('express');
var Spotify = require('./spotify');
var util = require('util');

var alexaApp = new alexa.app('SongCast');
var app = express();
var spotify = new Spotify();
var port = 3000;
var debugMode = false;

var options = {
	expressApp: app,
	checkCert: true,
	debug: false
};

if (process.env.NODE_ENV == 'debug') {
	debugMode = true;
	options.checkCert = false;
	options.debug = true;
	app.set('view engine', 'ejs');
	console.log('Songcast debug mode can now be accessed at: http://localhost:' + port + '/songcast');
}

alexaApp.express(options);

alexaApp.launch(function (req, res) {
	var prompt = 'I can cast Spotify tracks, albums, artists and playlists to all your Chromecast devices.';
	res.say(prompt);
});

alexaApp.intent('AMAZON.StopIntent', {
	'slots': {},
	'utterances': []
	},
	function (request, response) {
		Cast.stop();
		response.say('Stopping music on all devices').shouldEndSession(true).send();
	}
);

alexaApp.error = function(exception, request, response) {
	response.say("An error occurred and the previous request could not be completed. Please try again.").shouldEndSession(true).send();
};

app.listen(port);

spotify.on('loaded', function() {
	alexaApp.intent('PlayTrackIntent', {
		'slots': {
			'track': 'AMAZON.MusicRecording',
			'device': 'AMAZON.Room'
		},
		'utterances': [
			'Play the song {-|track} on {-|device}',
			'Play song {-|track} on {-|device}',
			'Play {-|track} on {-|device}'
		]
	},
	function (request, response) {
		if (debugMode) {
			console.log(request.slot('track'));
		}

		return spotify.searchTracks(request.slot('track'))
			.then(data => {
				var speech_text = util.format('%s by %s', data.title, data.artist);

				if (!debugMode) {
					Cast.play({ device: request.slot('device'), data: data, port: spotify.port });
				}

				response.card({
					type: 'Standard',
					title: speech_text,
					text: '',
					image: { smallImageUrl: data.image }
				});
				response.say('Now playing ' + speech_text).shouldEndSession(true).send();
			})
			.catch(err => {
				response.say(err.message).shouldEndSession(true).send();
			});
		}
	);

	alexaApp.intent('PlayTrackByArtistIntent', {
		'slots': {
			'track': 'AMAZON.MusicRecording',
			'artist': 'AMAZON.MusicGroup',
			'device': 'AMAZON.Room'
		},
		'utterances': [
			'Play the song {-|track} by {-|artist} on {-|device}',
			'Play song {-|track} by {-|artist} on {-|device}',
			'Play {-|track} by {-|artist} on {-|device}'
		]
	},
	function (request, response) {
		if (debugMode) {
			console.log(request.slot('track') + ' ' + request.slot('artist'));
		}

		return spotify.searchTracks(request.slot('track') + ' ' + request.slot('artist'))
			.then(data => {
				var speech_text = util.format('%s by %s', data.title, data.artist);

				if (!debugMode) {
					Cast.play({ device: request.slot('device'), data: data, port: spotify.port });
				}

				response.card({
					type: 'Standard',
					title: speech_text,
					text: '',
					image: { smallImageUrl: data.image }
				});
				response.say('Now playing ' + speech_text).shouldEndSession(true).send();
			})
			.catch(err => {
				response.say(err.message).shouldEndSession(true).send();
			});
		}
	);

	alexaApp.intent('StartPlaylistIntent', {
		'slots': {
			'playlist': 'AMAZON.MusicPlaylist',
			'device': 'AMAZON.Room'
		},
		'utterances': [
			'Play {-|playlist} playlist on {-|device}',
			'Playlist {-|playlist} on {-|device}',
			'Start playlist {-|playlist} on {-|device}',
			'Play songs from my {-|playlist} playlist on {-|device}',
			'Play playlist {-|playlist} on {-|device}'
		]
	},
	function (request, response) {
		if (debugMode) {
			console.log(request.slot('playlist'));
		}

		return spotify.searchPlaylists(request.slot('playlist'))
			.then(data => {
				var speech_text = util.format('Playing songs from %s', data.title)

				if (!debugMode) {
					Cast.play({ device: request.slot('device'), data: data, port: spotify.port });
				}

				response.card({
					type: 'Standard',
					title: speech_text,
					text: '',
					image: { smallImageUrl: data.image }
				});
				response.say(speech_text).shouldEndSession(true).send();
			})
			.catch(err => {
				response.say(err.message).shouldEndSession(true).send();
			});
		}
	);

	alexaApp.intent('StartArtistIntent', {
		'slots': {
			'artist': 'AMAZON.MusicGroup',
			'device': 'AMAZON.Room'
		},
		'utterances': [
			'Play artist {-|artist} on {-|device}',
			'Play songs by {-|artist} on {-|device}',
			'Play top songs by {-|artist} on {-|device}',
			'Play top tracks by {-|artist} on {-|device}',
			'Play music by {-|artist} on {-|device}',
			'Play tracks by {-|artist} on {-|device}',
		]
	},
	function (request, response) {
		if (debugMode) {
			console.log(request.slot('artist'));
		}

		return spotify.searchArtists(request.slot('artist'))
			.then(data => {
				var speech_text = util.format('Playing top tracks by %s', data.title);

				if (!debugMode) {
					Cast.play({ device: request.slot('device'), data: data, port: spotify.port });
				}

				response.card({
					type: 'Standard',
					title: speech_text,
					text: '',
					image: { smallImageUrl: data.image }
				});
				response.say(speech_text).shouldEndSession(true).send();
			})
			.catch(err => {
				response.say(err.message).shouldEndSession(true).send();
			});
		}
	);

	alexaApp.intent('StartAlbumIntent', {
		'slots': {
			'album': 'AMAZON.MusicAlbum',
			'device': 'AMAZON.Room'
		},
		'utterances': [
			'Play the album {-|album} on {-|device}',
			'Play album {-|album} on {-|device}'
		]
	},
	function (request, response) {
		if (debugMode) {
			console.log(request.slot('album'));
		}

		return spotify.searchAlbums(request.slot('album'))
			.then(data => {
				var speech_text = util.format('Playing %s by %s', data.title, data.artist)

				if (!debugMode) {
					Cast.play({ device: request.slot('device'), data: data, port: spotify.port });
				}

				response.card({
					type: 'Standard',
					title: speech_text,
					text: '',
					image: { smallImageUrl: data.image }
				});
				response.say(speech_text).shouldEndSession(true).send();
			})
			.catch(err => {
				response.say(err.message).shouldEndSession(true).send();
			});
		}
	);
});

module.exports = alexaApp;