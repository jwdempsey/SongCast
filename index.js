var alexa = require('alexa-app');
var Cast = require('./cast');
var express = require('express');
var ngrok = require('ngrok');
var Spotify = require('./spotify');
var util = require('util');

var alexaApp = new alexa.app('SongCast');
var app = express();
var spotify = new Spotify();
var port = 3001;

spotify.on('loaded', function() {
	var options = {
		expressApp: app,
		checkCert: true,
		debug: false
	};

	if (process.env.NODE_ENV == 'debug') {
		options.checkCert = false;
		options.debug = true;
		app.set('view engine', 'ejs');

		console.log('Songcast debug mode can now be accessed at: http://localhost:' + port + '/songcast');
	}

	if (process.env.NODE_ENV === 'prod') {
		ngrok.connect({
			proto: 'http',
			addr: port,
			host_header: 'rewrite ' + port,
			bind_tls: true
		}, function (err, url) {
			console.log('Songcast can now be accessed at: ' + url + '/songcast');
		});

		ngrok.once('error', function (err) {
			console.log(err.message);
		});
	}

	alexaApp.express(options);

	alexaApp.launch(function (req, res) {
		var prompt = 'I can cast Spotify tracks, albums, artists and playlists to all your Chromecast devices.';
		res.say(prompt);
	});

	alexaApp.intent('PlayTrackIntent', {
		'slots': {
			'track': 'AMAZON.MusicRecording',
			'device': 'AMAZON.LITERAL'
		},
		'utterances': [
			'Play the song {-|track} on {Downstairs|device}',
			'Play song {-|track} on {Downstairs|device}',
			'Play {-|track} on {Downstairs|device}'
		]
	},
	function (request, response) {
		return spotify.searchTracks(request.slot('track'))
			.then(data => {
				var speech_text = util.format('%s by %s', data.title, data.artist);
				var cast = new Cast({ device: request.slot('device'), data: data, port: spotify.port });

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
			'device': 'AMAZON.LITERAL'
		},
		'utterances': [
			'Play the song {-|track} by {-|artist} on {Downstairs|device}',
			'Play song {-|track} by {-|artist} on {Downstairs|device}',
			'Play {-|track} by {-|artist} on {Downstairs|device}'
		]
	},
	function (request, response) {
		return spotify.searchTracks(request.slot('track') + ' ' + request.slot('artist'))
			.then(data => {
				var speech_text = util.format('%s by %s', data.title, data.artist);
				var cast = new Cast({ device: request.slot('device'), data: data, port: spotify.port });

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
			'device': 'AMAZON.LITERAL'
		},
		'utterances': [
			'Play {-|playlist} playlist on {Downstairs|device}',
			'Playlist {-|playlist} on {Downstairs|device}',
			'Start playlist {-|playlist} on {Downstairs|device}',
			'Play songs from my {-|playlist} playlist on {Downstairs|device}',
			'Play playlist {-|playlist} on {Downstairs|device}'
		]
	},
	function (request, response) {
		return spotify.searchPlaylists(request.slot('playlist'))
			.then(data => {
				var speech_text = util.format('Playing songs from %s', data.title)
				var cast = new Cast({ device: request.slot('device'), data: data, port: spotify.port });

				response.card({
					type: 'Standard',
					title: speech_text,
					text: ''
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
			'device': 'AMAZON.LITERAL'
		},
		'utterances': [
			'Play artist {-|artist} on {Downstairs|device}',
			'Play songs by {-|artist} on {Downstairs|device}',
			'Play top songs by {-|artist} on {Downstairs|device}',
			'Play top tracks by {-|artist} on {Downstairs|device}',
			'Play music by {-|artist} on {Downstairs|device}',
			'Play tracks by {-|artist} on {Downstairs|device}',
		]
	},
	function (request, response) {
		return spotify.searchArtists(request.slot('artist'))
			.then(data => {
				var speech_text = util.format('Playing top tracks by %s', data.title);
				var cast = new Cast({ device: request.slot('device'), data: data, port: spotify.port });

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
			'device': 'AMAZON.LITERAL'
		},
		'utterances': [
			'Play the album {-|album} on {Downstairs|device}',
			'Play album {-|album} on {Downstairs|device}'
		]
	},
	function (request, response) {
		return spotify.searchAlbums(request.slot('album'))
			.then(data => {
				var speech_text = util.format('Playing %s %s by %s', data.title, data.artist)
				var cast = new Cast({ device: request.slot('device'), data: data, port: spotify.port });

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
});

module.exports = alexaApp;