var Client                	= require('castv2-client').Client;
var DefaultMediaReceiver  	= require('castv2-client').DefaultMediaReceiver;
var mdns                	= require('mdns');
var util					= require('util');
var ngrok 					= require('ngrok');

function Cast(item) {
	var self = this;
	var browser = mdns.createBrowser(mdns.tcp('googlecast'));
	browser.on('serviceUp', function(service) {
		if ('device' in item &&
			'fn' in service.txtRecord &&
			service.txtRecord.fn.toLowerCase() === item.device.toLowerCase()) {
			self._ondeviceup(service.addresses[0], item);
		}

		browser.stop();
	});

	browser.start();
}

Cast.prototype._ondeviceup = function(host, item) {
	var media = '';
	var client = new Client();
	client.connect(host, function() {
		client.launch(DefaultMediaReceiver, function(err, player) {
			ngrok.connect({
				proto: 'http',
				addr: 9001,
				host_header: 'rewrite 9001',
				bind_tls: true
			}, function (err, url) {
				media = {
					contentId: util.format('%s/%s/%s', url, item.type, item.url),
					contentType: 'audio/mpeg',
					streamType: 'BUFFERED',
					metadata: {
						metadataType: 3,
						title: item.title
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

module.exports = Cast;