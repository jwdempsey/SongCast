var Spotify		= require('./spotify');
var Cast		= require('./cast');

var spotify = new Spotify();

spotify.search('Andy grammar', 'honey I\'m good')
.then(function(url) {
	var cast = new Cast({ device: 'Downstairs', type: 'track', url: url, title: 'honey I\'m good' });
})
.catch(function(e) {
	console.log(e.message);
});