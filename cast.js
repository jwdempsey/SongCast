var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var dotenv = require('dotenv');
var mdns = require('mdns');
var ngrok = require('ngrok');
var util = require('util');

function Cast(item) {
	dotenv.load();
	var self = this;
	var device = item.device || process.env.defaultDevice || '';
	mdns.Browser.defaultResolverSequence[1] = 'DNSServiceGetAddrInfo' in mdns.dns_sd
		? mdns.rst.DNSServiceGetAddrInfo()
		: mdns.rst.getaddrinfo({families:[4]});

	var browser = mdns.createBrowser(mdns.tcp('googlecast'));
	browser.on('serviceUp', function(service) {
		if (service.txtRecord.fn.toLowerCase() === device.toLowerCase()) {
			self.onDeviceUp(service.addresses[0], item.data, item.port);
			browser.stop();
		}
	});

	browser.start();
}

Cast.prototype.onDeviceUp = function(host, item, port) {
	var media = {};
	var client = new Client();
	ngrok.disconnect();

	client.connect(host, function() {
		client.launch(DefaultMediaReceiver, function(err, player) {
			ngrok.connect({
				proto: 'http',
				addr: port,
				host_header: 'rewrite ' + port,
				bind_tls: true
			}, function (err, url) {
				media = {
					contentId: util.format('%s/%s/%s', url, item.type, item.url),
					contentType: 'audio/mpeg',
					streamType: 'BUFFERED',
					metadata: {
						metadataType: 3,
						title: item.title,
						artist: item.artist || '',
						albumName: item.album || '',
						images: [{ url: item.image }]
					}
				};

				player.load(media, { autoplay: true }, function(err, status) {});
			});
		});
	});

	client.on('error', function(err) {
		client.close();
		ngrok.disconnect();
	});
}

Cast.stop = function() {
	var client = new Client();
	mdns.Browser.defaultResolverSequence[1] = 'DNSServiceGetAddrInfo' in mdns.dns_sd
		? mdns.rst.DNSServiceGetAddrInfo()
		: mdns.rst.getaddrinfo({families:[4]});

	var browser = mdns.createBrowser(mdns.tcp('googlecast'));
	browser.on('serviceUp', function(service) {
		client.connect(service.addresses[0], function() {
			client.getSessions(function(err, sessions) {
				if (sessions.length > 0) {
					client.join(sessions[0], DefaultMediaReceiver, function(err, app) {
						client.stop(app, function(err, response) {
							// add check for only stopping Chromecast Audio
							console.log('stopping music on ' + service.txtRecord.fn);
							ngrok.disconnect();
						});
					});
				}
			});
		});

		browser.stop();
	});

	client.on('error', function(error) {
		client.close();
		ngrok.disconnect();
	});

	browser.start();
}

module.exports = Cast;