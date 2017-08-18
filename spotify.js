var dotenv = require('dotenv');
var EventEmitter = require("events").EventEmitter;
var express = require('express');
var lame = require('lame');
var libspotify = require('libspotify');
var Promise = require("bluebird");
var SpotifyWebApi = require('spotify-web-api-node');
var util = require('util');

function Spotify() {
	var self = this;
	dotenv.load();
	EventEmitter.call(this);
	this.queue = [];
	this.playlists = [];
	this.port = 9001;
	this.expiresIn = 0;
	this.defaultError = 'I could not find any %s with that name';
	this.scopes = [
		'playlist-read-private',
		'playlist-read-collaborative',
		'playlist-modify-public',
		'playlist-modify-private',
		'streaming',
		'ugc-image-upload',
		'user-follow-modify',
		'user-follow-read',
		'user-library-read',
		'user-library-modify',
		'user-read-private',
		'user-read-birthdate',
		'user-read-email',
		'user-top-read'
	];

	this.spotifyApi = new SpotifyWebApi({
		clientId : process.env.clientId,
		clientSecret : process.env.clientSecret,
		redirectUri : process.env.redirectUri
	});

	this.session = new libspotify.Session({
		applicationKey: __dirname + '/spotify_appkey.key'
	});

	this.session.login(process.env.username, process.env.password);
	this.session.once('login', function(err) {
		self.app = express();
		self.app.get('/:type/:id', function(req, res) {
			self.startStream.call(self, req, res);

			self.player.on('track-end', function() {
				self.playNext.call(self, req, res);
			});
		});

		self.app.get('/callback', function(req, res) {
			self.getToken.call(self, req, res);
		});

		self.app.get('/', function(req, res) {
			if (!self.spotifyApi.getAccessToken() || !self.spotifyApi.getRefreshToken()) {
				var url = self.spotifyApi.createAuthorizeURL(self.scopes, 'token-retrieved');
				res.redirect(url);
			} else {
				res.send('token retrieved successfully');
			}

		});

		self.app.listen(self.port);
	});

	this.encoder = lame.Encoder({ channels: 2, bitDepth: 16, sampleRate: 44100 });
	this.player = this.session.getPlayer();
	this.player.pipe(this.encoder);
}

util.inherits(Spotify, EventEmitter);

Spotify.prototype.getToken = function (req, res) {
	var self = this;
	this.spotifyApi.authorizationCodeGrant(req.query.code)
	.then(function(data) {
		self.spotifyApi.setAccessToken(data.body['access_token']);
		self.spotifyApi.setRefreshToken(data.body['refresh_token']);
		self.expiresIn = data.body['expires_in'];
		self.loadUserPlaylists.call(self);
		res.redirect('/?state=' + req.query.state);

	}, function(err) {
		return reject(new Error(err.message));
	});
}

Spotify.prototype.refreshToken = function () {
	var self = this;
	this.spotifyApi.refreshAccessToken()
	.then(function(data) {
		self.spotifyApi.setAccessToken(data.body['access_token']);
		self.expiresIn = data.body['expires_in'];
	}, function(err) {
		return reject(new Error(err.message));
	});
}

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

Spotify.prototype.loadUserPlaylists = function() {
	var self = this;
	self.spotifyApi.getMe()
	.then(function(user) {
		self.spotifyApi.getUserPlaylists(user.body.id)
		.then(function(playlists) {
			var items = playlists.body.items;
			for (var i = 0; i < items.length; i++) {
				self.playlists.push({
					type: 'playlist',
					title: items[i].name,
					image: items[i].images[0].url,
					url: items[i].uri
				});
			}
			setInterval(() => self.refreshToken(), self.expiresIn * 1000);
			self.emit('loaded');
		},function(err) {
			return reject(new Error(err.message));
		});

	}, function(err) {
		return reject(new Error(err.message));
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
			return reject(new Error(err.message));
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
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

Spotify.prototype.formatTitle = function (str) {
	return str.replace('&', 'and').replace(/[&\/\\#,+\(\)$~%\.!^'"\;:*?\[\]<>{}]/g, '').toLowerCase();
}

Spotify.prototype.getPublicPlaylistTracks = function (id) {
	var self = this;
	var tracks = [];

	return new Promise((resolve, reject) => {
		self.spotifyApi.getPlaylistTracks('spotify', id)
		.then(function(data) {
			if (data.body.items.length > 0) {
				var item = data.body.items;
				for (var i=0; i < item.length; i++) {
					tracks.push({
						type: 'track',
						id: item[i].track.uri,
						item: libspotify.Track.getFromUrl(item[i].track.uri)
					});
				}

				resolve(tracks);
			}

		}, function(err) {
			return reject(new Error(err.message));
		});
	});
}

Spotify.prototype.getAlbumTracks = function (id) {
    var self = this;
	return new Promise((resolve, reject) => {
		self.spotifyApi.getAlbumTracks(id)
		.then(function(data) {
			if (data.body.items.length > 0) {
				var tracks = [];
				for (var i = 0; i < data.body.items.length; i++) {
					tracks.push({
						type: 'track',
						id: data.body.items[i].uri,
						item: libspotify.Track.getFromUrl(data.body.items[i].uri)
					});
				}
				return resolve(tracks);
			} else {
				throw new Error('No tracks could be found for this album');
			}
		}, function(err) {
			return reject(new Error(err.message));
		});
	});
}

Spotify.prototype.getTracksFromArtist = function (id) {
	var self = this;
	return new Promise((resolve, reject) => {
		self.spotifyApi.getArtistTopTracks(id, 'US')
		.then(function(data) {
			if (data.body.tracks.length > 0) {
				var tracks = [];
				for (var i = 0; i < data.body.tracks.length; i++) {
					tracks.push({
						type: 'track',
						id: data.body.tracks[i].uri,
						item: libspotify.Track.getFromUrl(data.body.tracks[i].uri)
					});
				}
				return resolve(tracks);
			} else {
				throw new Error('No tracks could be found for this artist');
			}
		}, function(err) {
			return reject(new Error(err.message));
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

// Public Methods
Spotify.prototype.searchPlaylists = function (term) {
	var self = this;
	return new Promise((resolve, reject) => {
		self.searchUserPlaylists(term)
		.then(data => {
			return resolve(data);
		})
		.catch(err => {
			self.spotifyApi.searchPlaylists(term)
			.then(function(data) {
				var items = data.body.playlists.items;
				if (items.length > 0) {
					return resolve({
						type: 'spotify_playlist',
						title: items[0].name,
						image: items[0].images[0].url,
						url: items[0].id
					});
				} else {
					return reject(new Error(util.format(self.defaultError, 'playlists')));
				}

			}, function(err) {
				return reject(new Error(err.message));
			});
		})
	});
}

Spotify.prototype.searchTracks = function (term) {
	var self = this;
	return new Promise((resolve, reject) => {
		self.spotifyApi.searchTracks(term)
			.then(data => {
				data = data.body.tracks;
				return resolve({
					type: 'track',
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
	return new Promise((resolve, reject) => {
		self.spotifyApi.searchArtists(term)
			.then(data => {
				data = data.body.artists;
				return resolve({
					type: 'artist',
					title: data.items[0].name,
					artist: self.capitalizeFirstLetter(term),
					image: data.items[0].images[0].url,
					url: data.items[0].id
				});
			})
			.catch(err => {
				return reject(new Error(util.format(self.defaultError, 'artists')));
			});
	});
}

Spotify.prototype.searchAlbums = function (term) {
	var self = this;
	return new Promise((resolve, reject) => {
		self.spotifyApi.searchTracks('album:' + term)
			.then(data => {
				data = data.body.tracks.items[0].album;
				return resolve({
					type: 'album',
					title: data.name,
					artist: self.capitalizeFirstLetter(term),
					image: data.images[0].url,
					url: data.id
				});
			})
			.catch(err => {
				return reject(new Error(util.format(self.defaultError, 'albums')));
			});
	});
}
// End Public Methods

module.exports = Spotify;