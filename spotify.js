var cheerio = require('cheerio');
var dotenv = require('dotenv');
var EventEmitter = require("events").EventEmitter;
var express = require('express');
var lame = require('lame');
var libspotify = require('libspotify');
var Promise = require("bluebird");
var rp = require('request-promise');
var util = require('util');

function Spotify() {
	var self = this;
	dotenv.load();
	EventEmitter.call(this);
	this.encoder = lame.Encoder({ channels: 2, bitDepth: 16, sampleRate: 44100 });

	this.playlists = [];
	this.queue = [];
	this.port = 9001;
	this.searchUrl = 'https://api.spotify.com/v1/search?type=%s&q=%s';
	this.tracksFromArtist = 'https://api.spotify.com/v1/artists/%s/top-tracks?country=US';
	this.tracksFromAlbum = 'https://api.spotify.com/v1/albums/%s/tracks';
	this.defaultImage = 'https://developer.spotify.com/wp-content/uploads/2016/07/icon3@2x.png'
	this.defaultError = 'I could not find any %s with that name';

	this.session = new libspotify.Session({
		applicationKey: __dirname + '/spotify_appkey.key'
	});
	this.session.login(process.env.username, process.env.password);
	this.session.once('login', function(err) {
		self.getUserPlaylists.call(self);

		self.app = express();
		self.app.get('/:type/:id', function(req, res) {
			self.startStream.call(self, req, res);

			self.player.on('track-end', function() {
				self.playNext.call(self, req, res);
			});
		});
		self.app.listen(self.port);
	});

	this.player = this.session.getPlayer();
	this.player.pipe(this.encoder);
}

util.inherits(Spotify, EventEmitter);

Spotify.prototype.startStream = function (req, res) {
	this.queue = [];
	res.writeHead(200, {
		'Content-Type': 'audio/mpeg'
	});

	this.encoder.on('data', function(data) {
		res.write(data);
	});

	this.loadTrack({
		type: req.params.type,
		id: req.params.id
	});
}

Spotify.prototype.loadTrack = function (item) {
	var self = this;
	var track;
	var type = this.capitalizeFirstLetter(item.type);

	self.on('track.loaded', function() {
		try {
			track.once('ready', function() {
				self.player.load(track);
				self.player.play();
			});
		} catch(err) {
			console.log(err.message);
		}
	});

	switch (item.type) {
		case 'spotify_playlist':
			self.getPublicPlaylistTracks(item.id).then(tracks => {
				self.queue = tracks;
				track = self.queue.splice(0, 1)[0].item;
				self.emit('track.loaded');
			});
			break;
		case 'playlist':
			libspotify[type].getFromUrl(item.id).getTracks(tracks => {
				for (var i in tracks) {
					self.queue.push({
						type: 'track',
						id: tracks[i].getUrl(),
						item: tracks[i]
					});
				}
				track = self.queue.splice(0, 1)[0].item;
				self.emit('track.loaded');
			});
			break;
		case 'track':
			track = libspotify[type].getFromUrl(item.id);
			self.emit('track.loaded');
			break;
		case 'album':
			this.getAlbumTracks(item.id).then(tracks => {
				self.queue = tracks;
				track = self.queue.splice(0, 1)[0].item;
				self.emit('track.loaded');
			});
			break;
		case 'artist':
			this.getTracksFromArtist(item.id).then(tracks => {
				self.queue = tracks;
				track = self.queue.splice(0, 1)[0].item;
				self.emit('track.loaded');
			});
			break;
	}
}

Spotify.prototype.playNext = function (req, res) {
	if (this.queue.length > 0) {
		var item = this.queue.splice(0, 1)[0];
		this.loadTrack(item);
	} else {
		this.player.stop();
	}
}

Spotify.prototype.capitalizeFirstLetter = function (str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

Spotify.prototype.formatTitle = function (str) {
	return str.replace('&', 'and').replace(/[&\/\\#,+\(\)$~%\.!^'"\;:*?\[\]<>{}]/g, '').toLowerCase();
}

Spotify.prototype.getPublicPlaylistTracks = function (url) {
	var self = this;
	var tracks = [];

	return new Promise((resolve, reject) => {
		rp({uri: decodeURIComponent(url)})
			.then(html => {
				var $ = cheerio.load(html);
				var data = $('meta[property="music:song"]').each(function(i, elem) {
					var id = 'spotify:track:' + $(this).prop('content').split('https://open.spotify.com/track/')[1];
					tracks.push({
						type: 'track',
						id: id,
						item: libspotify.Track.getFromUrl(id)
					});
				});
				resolve(tracks);
			})
			.catch(err => {
				return reject(new Error(err.message));
			});
	});
}

Spotify.prototype.getAlbumTracks = function (id) {
    var self = this;

	return new Promise((resolve, reject) => {
		rp({ uri: util.format(self.tracksFromAlbum, id.split('spotify:album:')[1]), json: true })
			.then(data => {
				if (data.items.length > 0) {
					var tracks = [];
					for (var i = 0; i < data.items.length; i++) {
						tracks.push({
							type: 'track',
							id: data.items[i].uri,
							item: libspotify.Track.getFromUrl(data.items[i].uri)
						});
					}
					return resolve(tracks);
				} else {
					throw new Error('No tracks could be found for this album');
				}
			})
			.catch(err => {
				return reject(new Error(err.message));
			});
	});
}

Spotify.prototype.getTracksFromArtist = function (id) {
	var self = this;

	return new Promise((resolve, reject) => {
		rp({ uri: util.format(self.tracksFromArtist, id.split('spotify:artist:')[1]), json: true })
			.then(data => {
				if (data.tracks.length > 0) {
					var tracks = [];
					for (var i = 0; i < data.tracks.length; i++) {
						tracks.push({
							type: 'track',
							id: data.tracks[i].uri,
							item: libspotify.Track.getFromUrl(data.tracks[i].uri)
						});
					}
					return resolve(tracks);
				} else {
					throw new Error('No tracks could be found for this artist');
				}
			})
			.catch(err => {
				return reject(new Error(err.message));
			});
	});
}

Spotify.prototype.getUserPlaylists = function () {
	var self = this;
	var container = this.session.getPlaylistcontainer();
	container.once('ready', function() {
		container.getPlaylists(function (playlists) {
			for (var i = 0; i < playlists.length; i++) {
				self.playlists.push({
					type: 'playlist',
					title: playlists[i].name,
					image: self.defaultImage,
					url: playlists[i].getUrl()
				});
			}
			self.emit('loaded');
		});
	});
}

Spotify.prototype.searchUserPlaylists = function (item) {
	var self = this;
	return new Promise((resolve, reject) => {
		var userPlaylist = self.playlists.filter(function(obj) {
			return self.formatTitle(obj.title) === item.toLowerCase();
		});

		if (userPlaylist.length > 0) {
			return resolve(userPlaylist[0]);
		} else {
			return reject(new Error(util.format(self.defaultError, 'playlists')));
		}
	});
}

Spotify.prototype.searchAll = function (type, term) {
	var self = this;
	var identifer = type + 's';

	return new Promise((resolve, reject) => {
		rp({ uri: util.format(self.searchUrl, type, term), json: true })
			.then(data => {
				if (data[identifer].items.length > 0) {
					return resolve(data[identifer]);
				} else {
					throw new Error();
				}
			})
			.catch(err => {
				return reject(new Error(util.format(self.defaultError, identifer)));
			});
	});
}

// Public Methods
Spotify.prototype.searchPlaylists = function (term) {
	var self = this;
	var type = 'playlist';
	var index = 0;

	return new Promise((resolve, reject) => {
		self.searchUserPlaylists(term)
		.then(data => {
			return resolve(data);
		})
		.catch(err => {
			self.searchAll.call(self, type, term)
				.then(data => {
						for (var i in data.items) {
							if (self.formatTitle(data.items[i].name) == term.toLowerCase()) {
								index = i;
								break;
							}
						}
						return resolve({
							type: 'spotify_playlist',
							title: data.items[index].name,
							image: data.items[index].images[0].url,
							url: encodeURIComponent(data.items[index].external_urls.spotify)
						});
					})
				.catch(err => {
					return reject(new Error(util.format(self.defaultError, 'playlists')));
				});
		})
	});
}

Spotify.prototype.searchTracks = function (term) {
	var self = this;
	var type = 'track';

	return new Promise((resolve, reject) => {
		self.searchAll.call(this, type, term)
			.then(data => {
				return resolve({
					type: type,
					title: data.items[0].name,
					artist: data.items[0].artists[0].name,
					image: data.items[0].album.images[0].url,
					url: data.items[0].uri
				});
			})
			.catch(err => {
				return reject(new Error(util.format(self.defaultError, 'tracks')));
			});
	});
}

Spotify.prototype.searchArtists = function (term) {
	var self = this;
	var type = 'artist';

	return new Promise((resolve, reject) => {
		self.searchAll.call(this, type, term)
			.then(data => {
				return resolve({
					type: type,
					title: data.items[0].name,
					artist: term,
					image: data.items[0].images[0].url,
					url: data.items[0].uri
				});
			})
			.catch(err => {
				return reject(new Error(util.format(self.defaultError, 'artists')));
			});
	});
}

Spotify.prototype.searchAlbums = function (term) {
	var self = this;
	var type = 'album';

	return new Promise((resolve, reject) => {
		self.searchAll.call(this, type, term)
			.then(data => {
				return resolve({
					type: type,
					title: data.items[0].name,
					artist: data.items[0].artists[0].name,
					image: data.items[0].images[0].url,
					url: data.items[0].uri
				});
			})
			.catch(err => {
				return reject(new Error(util.format(self.defaultError, 'albums')));
			});
	});
}
// End Public Methods

module.exports = Spotify;