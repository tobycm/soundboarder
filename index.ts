import { GatewayIntentBits, GuildMember } from "discord.js";
import Soundboarder from "./Soundboarder";

// Creating an instance of the Discord.js client
const client = new Soundboarder({
  discord: {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
  },
  moonlink: {
    nodes: [
      {
        host: "localhost",
        port: 2333,
        secure: true,
        password: "password",
      },
    ],
    options: {},
    SPayload: (guild: string, sPayload: any) => {
      // Sending payload information to the server
      client.guilds.cache.get(guild)?.shard.send(JSON.parse(sPayload));
    },
  },
});

// Event: Raw data
client.on("raw", (data) => {
  // Updating the Moonlink.js package with the necessary data
  client.moon.packetUpdate(data);
});

// Event: Interaction created
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.inGuild() || !interaction.channel) return;
  if (!(interaction.member instanceof GuildMember)) return;
  if (interaction.commandName === "play") {
    if (!interaction.member.voice.channel) {
      // Responding with a message if the user is not in a voice channel
      return interaction.reply({
        content: `You are not in a voice channel`,
        ephemeral: true,
      });
    }

    const query = interaction.options.getString("query");

    if (!query)
      // Responding with a message if no query was provided
      return interaction.reply({ content: `Please provide a search query`, ephemeral: true });

    const player = client.moon.players.create({
      guildId: interaction.guild!.id,
      voiceChannel: interaction.member.voice.channel.id,
      textChannel: interaction.channel.id,
      autoPlay: true,
    });

    if (!player.connected) {
      // Connecting to the voice channel if not already connected
      player.connect({
        setDeaf: true,
        setMute: false,
      });
    }

    const res = await client.moon.search({
      query,
      source: "youtube",
      requester: interaction.user.id,
    });

    if (res.loadType === "error")
      // Responding with an error message if loading fails
      return interaction.reply({ content: `:x: Load failed - the system is not cooperating.` });
    else if (res.loadType === "empty")
      // Responding with a message if the search returns no results
      return interaction.reply({ content: `:x: No matches found!` });

    if (res.loadType === "playlist") {
      interaction.reply({ content: `${res.playlistInfo?.name} This playlist has been added to the waiting list, spreading joy` });

      // Adding tracks to the queue if it's a playlist
      for (const track of res.tracks) player.queue.add(track);
    } else {
      player.queue.add(res.tracks[0]);
      interaction.reply({ content: `${res.tracks[0].title} was added to the waiting list` });
    }

    if (!player.playing)
      // Starting playback if not already playing
      player.play();
  }
});

// Logging in with the Discord token
client.login(process.env["DISCORD_TOKEN"]);
