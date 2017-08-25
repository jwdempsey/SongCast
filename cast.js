var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var dotenv = require('dotenv');
var mdns = require('mdns');
var ngrok = require('ngrok');
var util = require('util');

var activeDevice = '192.168.1.118';
dotenv.load();
mdns.Browser.defaultResolverSequence[1] = 'DNSServiceGetAddrInfo' in mdns.dns_sd
	? mdns.rst.DNSServiceGetAddrInfo()
	: mdns.rst.getaddrinfo({families:[4]});

function onDeviceUp(host, item, port) {
	var media = {};
	var client = new Client();

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

module.exports = {
	play: function(item) {
		var device = item.device || process.env.defaultDevice || '';
		var browser = mdns.createBrowser(mdns.tcp('googlecast'));

		browser.on('serviceUp', function(service) {
			if (service.txtRecord.fn.toLowerCase() === device.toLowerCase()) {
				ngrok.disconnect();
				activeDevice = service.addresses[0];
				onDeviceUp(service.addresses[0], item.data, item.port);
				browser.stop();
			}
		});

		browser.start();
	},

	stop: function() {
		var client = new Client();
		var browser = mdns.createBrowser(mdns.tcp('googlecast'));

		browser.on('serviceUp', function(service) {
			if (activeDevice === service.addresses[0]) {
				client.connect(service.addresses[0], function() {
					client.getSessions(function(err, sessions) {
						if (sessions.length > 0) {
							client.join(sessions[0], DefaultMediaReceiver, function(err, app) {
								client.stop(app, function(err, response) {
									console.log('stopping music on ' + service.txtRecord.fn);
									ngrok.disconnect();
									activeDevice = null;
								});
							});
						}
					});
				});
			}
			browser.stop();
		});

		client.on('error', function(error) {
			client.close();
			ngrok.disconnect();
			activeDevice = null;
		});

		browser.start();
	}
}