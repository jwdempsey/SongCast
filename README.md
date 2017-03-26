# SongCast
This skill will alow you to play just about anything from a Spotify Premium account on any Chromecast device in your house. You will need to create an Amazon developer account and create a new Amazon skill. The installation instructions below should help you get started.

### Setup
1. Install libspotfy globally for your OS
2. Install ngrok globally
3. Install pm2 globally
4. Pull down repo (using git clone or download the zip from github)
5. Run npm install (this assumes you have node already installed)
6. Create an .env file in the root Songcast directory and add the following lines
```
username="your spotify username"
password="your spotify password"
defaultDevice="a default chromecast device"
```
7. Start ngrok on port 3000 (it should not be run from Songcast as it crashes frequently)
8. Start Songcast with pm2 (pm2 start index.js). I recommend pm2 as it will make sure your app continues to run forever
9. Setup Songcast skill on Amazon dev console
10. Copy utterances/schema into app on Amazon (can be found by running in dev mode and hitting localhost:3000/songcast)
11. Copy ngrok URL into app on Amazon

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