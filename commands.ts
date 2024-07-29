import { AutocompleteInteraction, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { getButtons, makeSoundboard, Scope } from "./common";

interface Command {
  data: SlashCommandBuilder;

  run: (interaction: ChatInputCommandInteraction) => any | Promise<any>;
  completion?: (interaction: AutocompleteInteraction) => any | Promise<any>;
}

const commands: Command[] = [];

commands.push({
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
  run: (interaction) => interaction.reply("Pong!"),
});

const newCommandData = new SlashCommandBuilder().setName("new").setDescription("New soundboard button");
newCommandData
  .addStringOption((option) =>
    option.setName("name").setDescription("Name of the soundboard button").setRequired(true).setMinLength(1).setMaxLength(40)
  )
  .addAttachmentOption((option) => option.setName("file").setDescription("Sound file to play. Max 15s or 1MB").setRequired(true))
  // .addStringOption((option) => option.setName("emoji").setDescription("Emoji to use for the button").setRequired(false))
  .addStringOption((option) =>
    option
      .setName("scopes")
      .setDescription("Scopes of the button (Only you is default) (multiple scopes can be selected, seperated by commas)")
      .setRequired(false)
      .setChoices([
        { name: "Server", value: "guild" },
        { name: "Channel", value: "channel" },
        { name: "Role", value: "role" },
        { name: "Member (only for you in this server)", value: "member" },
        { name: "Only you", value: "user" },
      ])
  )
  .addRoleOption((option) => option.setName("role").setDescription("Role to set the button to (if using role scope)").setRequired(false));

commands.push({
  data: newCommandData,
  async run(interaction) {
    const name = interaction.options.getString("name", true);
    const file = interaction.options.getAttachment("file", true);
    const scope = interaction.options.getString("scope") || "user";
    const role = interaction.options.getRole("role");
    // const emoji = interaction.options.getString("emoji");

    if (name.length > 40) return interaction.reply("Name is too long. Max 40 characters.");
    if (name.includes(":") || name.includes("*")) return interaction.reply("Name cannot contain a colon (:) or an asterisk (*).");

    if (!file) return interaction.reply("No file provided.");
    if (!file.contentType?.startsWith("audio/")) return interaction.reply("File is not an audio file.");
    if (file.size > 5 * 1024 ** 2) return interaction.reply("File is too large. Max 1MB.");
    // if (file.duration > 15) return interaction.reply("File is too long. Max 15s.");

    if (!["guild", "channel", "role", "member", "user"].includes(scope)) return interaction.reply("Invalid scope.");
    if (scope !== "user" && !interaction.guild) return interaction.reply("This scope can only be used in a server.");
    if (scope === "role") if (!role) return interaction.reply("No role provided for role scope.");
    if (scope === "channel" && (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel?.id))
      return interaction.reply("You must be in a voice channel to use channel scope.");

    const id = `${
      scope === "guild"
        ? interaction.guild!.id
        : scope === "channel"
        ? // @ts-ignore ts is not that smart yet
          interaction.member.voice.channel.id
        : scope === "role"
        ? role?.id
        : scope === "member"
        ? `${interaction.guild!.id}.${interaction.user.id}`
        : interaction.user.id
    }:${name}`;

    if (await interaction.client.db.exists(id)) return interaction.reply("Button already exists.");

    await interaction.client.db.hset(id, {
      created: Date.now(),

      file: file.url,
      emoji: "🔊",
    });

    await interaction.reply(`Created new soundboard button: ${name}`);
  },
});

const soundboardCommandData = new SlashCommandBuilder().setName("soundboard").setDescription("Show soundboard");

commands.push({
  data: soundboardCommandData,
  async run(interaction) {
    const scopes: Scope[] = ["user"];
    if (interaction.inGuild()) scopes.push("guild", "role", "member");
    if (interaction.member instanceof GuildMember && interaction.member.voice.channel) scopes.push("channel");

    const buttons = await getButtons(
      interaction.client.db,
      interaction,

      {
        scopes,
        roles: Array.from((interaction.member as GuildMember | undefined)?.roles.cache.values() ?? []),
      }
    );

    if (buttons.length === 0) return interaction.reply("No buttons added. Use </new:1267256102685245560> to add a new button.");

    interaction.reply({
      content: "Soundboard",
      components: [...makeSoundboard(buttons)],
    });
  },
});

const copyCommandData = new SlashCommandBuilder().setName("copy").setDescription("Copy a soundboard button");

export default commands;
