import { getVoiceConnection } from "@discordjs/voice";
import { Events, GatewayIntentBits } from "discord.js";
import { Redis } from "ioredis";
import Soundboarder from "./Soundboarder";
import commands from "./commands";
import handleSoundboard from "./handleSoundboard";

declare module "discord.js" {
  export interface Client {
    db: Redis;
  }
}

// Creating an instance of the Discord.js client
const client = new Soundboarder({
  discord: {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
  },
  redis: process.env.REDIS_URL ?? 6379,
});

const admins = process.env.ADMINS?.split(",") || [];

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (!admins.includes(message.author.id)) return;

  if (message.content.split(" ")[1] === "deploy")
    try {
      await client.application?.commands.set(commands.map((command) => command.data));
      await message.reply("Deployed commands.");
      console.log("Deployed commands.");
    } catch (error) {
      console.error(error);
      await message.reply("Failed to deploy commands.");
    }
});

// Event: Interaction created
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) return handleSoundboard(interaction);

  if (interaction.isAutocomplete()) {
    const command = commands.find((cmd) => cmd.data.name === interaction.commandName);
    if (!command) return;

    if (command.completion) await command.completion(interaction);

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands.find((cmd) => cmd.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.run(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply("An error occurred while executing this command.");
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (newState.channel?.members.size != 1) return;

  if (
    oldState.channel?.members.size == 2 &&
    oldState.channel.members.get(newState.client.user.id) &&
    newState.channel.members.get(newState.client.user.id)
  )
    // alone in voice
    getVoiceConnection(newState.guild.id)?.destroy();
});

if (!process.env.DISCORD_TOKEN) {
  console.error("No Discord token provided.");
  process.exit(1);
}

// Logging in with the Discord token
client.login(process.env.DISCORD_TOKEN);
