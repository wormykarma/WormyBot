const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");
//const txtomp3 = require("text-to-mp3");

var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));

const yt_api_key = config.yt_api_key;
const prefix = config.prefix;
const discord_token = config.discord_token;
const giphy_token = config.giphy_token;

const giphy = require('giphy-api')(giphy_token);

const responses = [ "Fuck off", "spoon head", "Get some kills bitch", "No", "Suck a nut", "Bite me Bitch", "no u", "Nu fon hu dis", "fuck me with a coconut", "BITCH!!!!", "Roll over for me baby", "we haff to be mad its only game", "Fight me", "NO", "Stop it", "I like the way you scream", "Louder baby Louder", "Fuck you", "Ya wee scottish cunt", "RAGE", "Ya wot m8", "You dont have to worry about grenades now"];
const attackers = [ "Sledge", "Thatcher", "Ash", "Thermite", "Twitch", "Montagne", "Glaz", "Fuze", "Blitz", "IQ", "Buck", "Blackbeard", "Capitao", "Hibana", "Jackal", "Ying", "Zofia", "Dokkaebi", "Lion", "Finka", "Maverick", "Nomad", "Gridlock", "Nokk", "Amaru", "Kali"];
const defenders = [ "Smoke", "Mute", "Castle", "Pulse", "Doc", "Rook", "Kapkan", "Tachanka", "Jager", "Bandit", "Frost", "Valkyrie", "Caveira", "Echo", "Mira", "Lesion", "Ela", "Vigil", "Maestro", "Alibi", "Clash", "Kaid", "Mozzie", "Warden", "Goyo", "Wamai"];

var guilds = {};

client.login(discord_token);

client.on('message', function (message) {
	const member = message.member;
	const mess = message.content.toLowerCase();
	const args = message.content.split(' ').slice(1).join(" ");

	if (!guilds[message.guild.id]) {
		guilds[message.guild.id] = {
			queue: [],
			queueNames: [],
			isPlaying: false,
			dispatcher: null,
			voiceChannel: null,
			skipReq: 0,
			skippers: []
		};
	}

	if (mess.startsWith(prefix + "play")) {
		if(member.voiceChannel || guilds[message.guild.id].voiceChannel != null) {
			if (args === '') {
				if (guilds[message.guild.id].queue.legnth > 0 || guilds[message.guild.id].isPlaying) {
					message.reply(" resuming music");
					guilds[message.guild.id].dispatcher.resume();
				} else {
					message.reply(" bot is not playing and no song is given!");
				}
			} else {
				if (guilds[message.guild.id].queue.legnth > 0 || guilds[message.guild.id].isPlaying) {
					if(guilds[message.guild.id].voiceChannel === message.member.voiceChannel) {
						getID(args, function (id) {
							add_to_queue(id, message);
							fetchVideoInfo(id, function (err, videoInfo) {
								if (err) throw new Error(err);
								message.channel.send("Added to queue: **" + videoInfo.title + "**");
								guilds[message.guild.id].queueNames.push(videoInfo.title);
								//message.channel.send("Added to queue playing: **" + guilds[message.guild.id].queueNames[0] + "**");
							});
						});
					} else {
						message.reply(' you must be in the same voice channel as the bot to control music');
					}
				} else {
					guilds[message.guild.id].isPlaying = true;
					getID(args, function (id) {
						guilds[message.guild.id].queue.push(id);
						fetchVideoInfo(id, function (err, videoInfo) {
							if (err) throw new Error(err);
							guilds[message.guild.id].queueNames.push(videoInfo.title);
							message.channel.send("Now playing: **" + guilds[message.guild.id].queueNames[0] + "**");
						});
						playMusic(id, message);
					});
				}
			}
		} else {
			message.reply(" you need to be in a voice channel you fuckin retard!");
		}

	} else if (mess.startsWith(prefix + "skip")) {
		if (guilds[message.guild.id].voiceChannel === message.member.voiceChannel) {
			if (guilds[message.guild.id].skippers.indexOf(message.author.id) === -1) {
				guilds[message.guild.id].skippers.push(message.author.id);
				guilds[message.guild.id].skipReq++;
				if (guilds[message.guild.id].skipReq >= Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2)) {
					skip_song(message);
					message.reply(" your skip has been acknowledged. Skipping now!");
				} else {
					message.reply(" your skip has been acknowledged. You need **" + (Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2) - guilds[message.guild.id].skipReq) + "** more skip votes!");
				}
			} else {
				message.reply(" you already voted to skip you spoon!");
			}
		} else {
			message.reply(' you must be in the same voice channel as the bot to control music');
		}

	} else if (mess.startsWith(prefix + "queue")) {
		var message2 = "```";
		for (var i = 0; i < guilds[message.guild.id].queueNames.length; i++) {
			var temp = (i + 1) + ": " + guilds[message.guild.id].queueNames[i] + (i === 0 ? " **(Current Song)**" : "") + "\n";
			if ((message2 + temp).length <= 2000 - 3) {
				message2 += temp;
			} else {
				message2 += "```";
				message.channel.send(message2);
				message2 = "```";
			}
		}
		message2 += "```";
		message.channel.send(message2);

	} else if (mess.startsWith(prefix + "gif")) {
		giphy.random({
			tag: args.replace(" ","+"),
			rating: 'r'
		}, function (err,res) {
			const embed = new Discord.RichEmbed()
			.setImage(res.data.image_url)
			message.channel.send({embed: embed});
		});

	} else if (mess.startsWith(prefix + "stop")) {
		if (guilds[message.guild.id].voiceChannel === message.member.voiceChannel) {
			if (guilds[message.guild.id].queue.legnth > 0 || guilds[message.guild.id].isPlaying) {
				guilds[message.guild.id].queue = [];
				guilds[message.guild.id].dispatcher.end();
			} else {
				message.reply(" OI fucking retard the bot is not playing!");
			}
		} else {
			message.reply(' you must be in the same voice channel as the bot to control music');
		}

    } else if (mess.startsWith(prefix + "pause")) {
    	if (guilds[message.guild.id].voiceChannel === message.member.voiceChannel) {
	    	if (guilds[message.guild.id].queue.legnth > 0 || guilds[message.guild.id].isPlaying) {
	    		message.reply(" pausing music");
	    		guilds[message.guild.id].dispatcher.pause();
	    	} else {
	    		message.reply(" OI fucking retard the bot is not playing!");
	    	}
	    } else {
	    	message.reply(' you must be in the same voice channel as the bot to control music');
	    }

	} else if (mess.startsWith(prefix + "resume")) {
		if (guilds[message.guild.id].voiceChannel === message.member.voiceChannel) {
			if (guilds[message.guild.id].queue.legnth > 0 || guilds[message.guild.id].isPlaying) {
				message.reply(" resuming music");
				guilds[message.guild.id].dispatcher.resume();
			} else {
				message.reply(" OI fucking retard the bot is not playing!");
			}
		} else {
			message.reply(' you must be in the same voice channel as the bot to control music');
		}

	} else if (mess.startsWith(prefix + "kez")) {
		message.channel.send("<@422793872142368799> " + get_response());
	} else if (mess.startsWith(prefix + "raptor")) {
		message.channel.send("<@201743411944882176> " + get_response());
	} else if (mess.startsWith(prefix + "cam")) {
		message.channel.send("<@286941014185476097> " + get_response());
	} else if(mess.startsWith(prefix + "lax")) {
		message.channel.send("<@336602541372604428> " + get_response());
	} else if (mess.startsWith(prefix + "karma") || mess.startsWith(prefix + "wormy")) {
		message.channel.send("<@237267293116170240> " + get_response());
	
	} else if (mess.startsWith(prefix + "enhance")) {
		guilds[message.guild.id].isPlaying = true;
		getID("https://www.youtube.com/watch?v=lI5ro_cgDd8", function (id) {
			guilds[message.guild.id].queue.push(id);
			fetchVideoInfo(id, function (err, videoInfo) {
				if (err) throw new Error(err);
				guilds[message.guild.id].queueNames.push(videoInfo.title);
				message.channel.send("It's time to enhance, get ready for the ** RAGE **");
			});
			playMusic(id, message);
		});

	} else if (mess.startsWith(prefix + "sticker")) {
		giphy.random({
			api: 'stickers',
			tag: args.replace(" ","+"),
			rating: 'r'
		}, function (err,res) {
			const embed = new Discord.RichEmbed()
			.setImage(res.data.image_url)
			message.channel.send({embed: embed});
		});
	
	} else if (mess.startsWith(prefix + "daddy")) {
		request({
			url: 'https://icanhazdadjoke.com/',
			method: 'GET',
			headers: {
				Accept: 'application/json'
			},
			gzip: true
		}, (error, response, body) => {
			body = JSON.parse(body);
			message.channel.send(body.joke);
		});
	
	} else if (mess.startsWith(prefix + "pick")) {
		var choices = args.split(",");
		var numChoices = choices.length;
		var rng = Math.random();
		var choice = Math.floor(rng/(1/numChoices)+1);
		message.reply(" The choice made was **" + choices[choice-1] + "**");
	
	} else if (mess.startsWith(prefix + "attack")) {
		var limit = attackers.length;
		var x = Math.floor(Math.random() * limit);
		message.reply(attackers[x]);
	} else if (mess.startsWith(prefix + "defence")) {
		var limit = defenders.length;
		var x = Math.floor(Math.random() * limit);
		message.reply(defenders[x]);
	
	} else if (member.id == "235088799074484224") {
		message.reply("Come at me Dave");
	}
});

client.on('voiceStateUpdate', function(oldMember, newMember) {
	if(newMember.id === config.jake_id) {
		let newUserChannel = newMember.voiceChannel
		let oldUserChannel = oldMember.voiceChannel
		if(oldUserChannel === undefined && newUserChannel !== undefined) {
			// User Joins a voice channel
			if (guilds[newMember.guild.id] === undefined) {
				newUserChannel.join().then(function (connection) {
					stream = ytdl("https://www.youtube.com/watch?v=Uufq_PFXbpA", {
						filter: 'audioonly'
					});
					var dispatcher = connection.playStream(stream);
					dispatcher.on('end', function () {
						newUserChannel.leave();
					});
					dispatcher.on('error', function () {
						console.log("it broke");
					})
				});
			} else if (!(guilds[newMember.guild.id].queue.legnth > 0 || guilds[newMember.guild.id].isPlaying)) {
				newUserChannel.join().then(function (connection) {
					stream = ytdl("https://www.youtube.com/watch?v=Uufq_PFXbpA", {
						filter: 'audioonly'
					});
					var dispatcher = connection.playStream(stream);
					dispatcher.on('end', function () {
						newUserChannel.leave();
					});
				});
			}
		}
	}
});

client.on('ready', function() {
	console.log('I am ready!');
	client.user.setActivity('w!your mum');
});

function get_response() {
	var limit = responses.length;
	var x = Math.floor(Math.random() * limit);
	return responses[x];
}

function skip_song(message) {
	guilds[message.guild.id].dispatcher.end();
}

function playMusic(id, message) {
	guilds[message.guild.id].voiceChannel = message.member.voiceChannel;

	guilds[message.guild.id].voiceChannel.join().then(function (connection) {
		stream = ytdl("https://www.youtube.com/watch?v=" + id, {
			filter: 'audioonly'
		});
		guilds[message.guild.id].skipReq = 0;
		guilds[message.guild.id].skippers = [];
		guilds[message.guild.id].dispatcher = connection.playStream(stream);
		guilds[message.guild.id].dispatcher.on('end', function () {
			guilds[message.guild.id].skipReq = 0;
			guilds[message.guild.id].skippers = [];
			guilds[message.guild.id].queue.shift();
			guilds[message.guild.id].queueNames.shift();
			if (guilds[message.guild.id].queue.length === 0) {
				guilds[message.guild.id].queue = [];
				guilds[message.guild.id].queueNames = [];
				guilds[message.guild.id].isPlaying = false;
				guilds[message.guild.id].voiceChannel.leave();
				message.channel.send("Queue ended leaving voice channel");
			} else {
				setTimeout(function() {
					message.channel.send("Now playing: **" + guilds[message.guild.id].queueNames[0] + "**");
					playMusic(guilds[message.guild.id].queue[0], message);
				}, 500);
			}
		});
	});
}

function getID(str, cb) {
	if (isYoutube(str)) {
		cb(getYouTubeID(str));
	} else {
		search_video(str, function (id) {
			cb(id);
		});
	}
}

function add_to_queue(strID, message) {
	if (isYoutube(strID)) {
		guilds[message.guild.id].queue.push(getYouTubeID(strID));
	} else {
		guilds[message.guild.id].queue.push(strID);
	}
}

function search_video(query, callback) {
	request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
		var json = JSON.parse(body);
		if (!json.items[0]) callback("3_-a9nVZYjk");
		else {
			callback(json.items[0].id.videoId);
		}
	});
}

function isYoutube(str) {
	return str.toLowerCase().indexOf("youtube.com") > -1;
}