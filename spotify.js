var lame = require('lame');
var libspotify = require('libspotify');
var express = require('express');
var Promise = require("bluebird");
var dotenv = require('dotenv');

function Spotify() {
	var self = this;
	this._session;
	this._app = express();
	this._app.get('/:type/:id', function(req, res) { self._play.call(self, req, res); });
	this._app.listen(9001);
	this._login();
}

Spotify.prototype._login = function () {
	dotenv.load();
	this._session = new libspotify.Session({
		applicationKey: __dirname + '/spotify_appkey.key'
	});

	if (!this._session.isLoggedIn()) {
		this._session.login(process.env.username, process.env.password);
	}
}

Spotify.prototype._play = function (req, res) {
	var self = this;
	res.writeHead(200, {
		'Content-Type': 'audio/mpeg'
	});

	var encoder = lame.Encoder({
		channels: 2,
		bitDepth: 16,
		sampleRate: 44100
	});

	encoder.on('data', function(data) {
		res.write(data);
	});

	var track = libspotify.Track.getFromUrl(req.params.id);
	track.whenReady(function() {
		var player = self._session.getPlayer();
		player.load(track);
		player.play();
		player.pipe(encoder);
	});
}

Spotify.prototype.search = function (artist, song) {
	return new Promise(function (resolve, reject) {
		var search = new libspotify.Search('track:"' + song + '"');
		search.execute();
		search.once('ready', function() {
			if (!search.tracks.length || search.tracks.length == 0) {
				reject(new Error('I could not find any tracks with that name'));
			} else {
				resolve(search.tracks[0].getUrl());
			}
		});
	});
}

module.exports = Spotify;