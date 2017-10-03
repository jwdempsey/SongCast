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
			'Cast the song {-|track} to {-|device}',
			'Cast song {-|track} to {-|device}',
			'Cast {-|track} to {-|device}'
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
			'Cast the song {-|track} by {-|artist} to {-|device}',
			'Cast song {-|track} by {-|artist} to {-|device}',
			'Cast {-|track} by {-|artist} to {-|device}'
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
			'Cast {-|playlist} playlist to {-|device}',
			'Playlist {-|playlist} to {-|device}',
			'Start playlist {-|playlist} to {-|device}',
			'Cast songs from my {-|playlist} playlist to {-|device}',
			'Cast playlist {-|playlist} to {-|device}'
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
			'Cast artist {-|artist} to {-|device}',
			'Cast songs by {-|artist} to {-|device}',
			'Cast top songs by {-|artist} to {-|device}',
			'Cast top tracks by {-|artist} to {-|device}',
			'Cast music by {-|artist} to {-|device}',
			'Cast tracks by {-|artist} to {-|device}',
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
			'Cast the album {-|album} to {-|device}',
			'Cast album {-|album} to {-|device}'
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