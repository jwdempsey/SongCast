# SongCast
This skill will alow you to play just about anything from a Spotify Premium account on any Chromecast device in your house. You will need to create both Amazon and Spotify developer accounts. The installation instructions below should help you get started.

### Setup
1. Install libspotfy globally for your OS
2. Install ngrok globally
3. Pull down repo (using git clone or download the zip from github)
4. Run npm install (this assumes you have node already installed)
5. Install libavahi-compat-libdnssd-dev (if necessary)
6. Start ngrok using the provided yml file (ngrok start -config /path/to/ngrok.yml --all)
7. Create a Spotify Developer account and create a new application
8. Create an .env file in the root Songcast directory and add the following lines
```
username="your spotify username"
password="your spotify password"
defaultDevice="a default chromecast device"
redirectUri="a locally hosted ngrok url"
clientId="clientId from Spotify"
clientSecret="clientSecret from Spotify"
```
9. Start Songcast by calling "node index.js"
10. Setup Songcast skill on Amazon Dev Console
11. Copy utterances/schema into app on Amazon (can be found by running in debug mode and hitting localhost:3000/songcast after getting a valid Spotify token)
12. Setup Account linking using Auth Code Grant as the Authorization Grant Type
13. Copy ngrok URL into app on Amazon

### Current Utterances supported
```
Play the song {track} on {device}
Play song {track} on {device}
Play {track} on {device}
Play the song {track} by {artist} on {device}
Play song {track} by {artist} on {device}
Play {track} by {artist} on {device}
Play {playlist} playlist on {device}
Playlist {playlist} on {device}
Start playlist {playlist} on {device}
Play songs from my {playlist} playlist on {device}
Play playlist {playlist} on {device}
Play artist {artist} on {device}
Play songs by {artist} on {device}
Play top songs by {artist} on {device}
Play top tracks by {artist} on {device}
Play music by {artist} on {device}
Play tracks by {artist} on {device}
Play the album {album} on {device}
Play album {album} on {device}
```