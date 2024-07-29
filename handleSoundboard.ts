import {
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { ButtonInteraction, GuildMember } from "discord.js";
import { DBButton } from "./common";

const players = new Map<string, AudioPlayer>();

export default async function handleSoundboard(interaction: ButtonInteraction) {
  // return minimalExample(interaction);

  if (!interaction.guild) return interaction.reply("This command can only be used in a server.");
  if (!(interaction.member instanceof GuildMember)) return interaction.reply("This command can only be used by a server member."); // should never happens tbh

  if (!interaction.member.voice.channel) return interaction.reply("You must be in a voice channel to use the soundboard.");

  const button = (await interaction.client.db.hgetall(interaction.customId)) as unknown as DBButton;
  if (!button) return interaction.reply("Button not found in database. It may have been deleted.");

  const resource = createAudioResource("/home/toby/Downloads/youtube_1fRq1QzcBRc_audio short.mp3");

  let player = players.get(interaction.guild.id);
  if (player) return player.play(resource);

  const connection =
    getVoiceConnection(interaction.guild.id) ||
    joinVoiceChannel({
      adapterCreator: interaction.guild.voiceAdapterCreator,
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.guild.id,

      selfDeaf: true,

      debug: true,
    });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Seems to be reconnecting to a new channel - ignore disconnect
    } catch (error) {
      // Seems to be a real disconnect which SHOULDN'T be recovered from
      connection.destroy();
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    players.get(interaction.guild!.id)?.stop();
    players.delete(interaction.guild!.id);
  });

  connection.on("debug", console.log);
  connection.on("error", console.error);

  player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop }, debug: true });

  player.on("debug", console.log);
  player.on("error", console.error);

  players.set(interaction.guild.id, player);

  connection.subscribe(player);
  try {
    player.play(resource);
    console.log("Playing sound.");
  } catch (error) {
    console.error(error);
    return interaction.reply("Failed to play sound.");
  }
}

async function minimalExample(interaction: ButtonInteraction) {
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Stop,
    },
    debug: true,
  });
  const resource = createAudioResource("/home/toby/Downloads/youtube_1fRq1QzcBRc_audio short.mp3");

  player.on("debug", console.log);
  player.on("error", console.error);

  const connection = joinVoiceChannel({
    channelId: (interaction.member as GuildMember).voice.channel!.id,
    guildId: interaction.guild!.id,
    adapterCreator: interaction.guild!.voiceAdapterCreator,

    debug: true,
  });

  connection.on("debug", console.log);
  connection.on("error", console.error);

  connection.subscribe(player);
  player.play(resource);
}
