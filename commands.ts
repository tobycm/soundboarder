import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

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
  .addStringOption((option) => option.setName("name").setDescription("Name of the soundboard button").setRequired(true))
  .addAttachmentOption((option) => option.setName("file").setDescription("Sound file to play. Max 15s or 1MB").setRequired(true))
  .addStringOption((option) =>
    option
      .setName("scope")
      .setDescription("Scope of the button (Only you is default)")
      .setRequired(false)
      .setChoices([
        {
          name: "Server",
          value: "guild",
        },
        {
          name: "Channel",
          value: "channel",
        },
        {
          name: "Role",
          value: "role",
        },
        {
          name: "Member (only for you in this server)",
          value: "member",
        },
        {
          name: "Only you",
          value: "user",
        },
      ])
  )
  .addRoleOption((option) => option.setName("role").setDescription("Role to set the button to (if using role scope)").setRequired(false));

commands.push({
  data: newCommandData,
  run: async (interaction) => {
    const name = interaction.options.getString("name", true);
    const file = interaction.options.getAttachment("file", true);
    const scope = interaction.options.getString("scope") || "user";
    const role = interaction.options.getRole("role");

    if (!file) return interaction.reply("No file provided.");

    if (!file.contentType?.startsWith("audio/") || !file.duration) return interaction.reply("File is not an audio file.");

    if (file.size > 1024 ** 2) return interaction.reply("File is too large. Max 1MB.");
    if (file.duration > 15) return interaction.reply("File is too long. Max 15s.");

    if (!["guild", "channel", "role", "member", "user"].includes(scope)) return interaction.reply("Invalid scope.");

    if (scope !== "user") if (!interaction.inGuild()) return interaction.reply("This scope can only be used in a server.");
    if (scope === "role") if (!role) return interaction.reply("No role provided for role scope.");

    const id =
      scope === "guild"
        ? interaction.guild!.id
        : scope === "channel"
        ? interaction.channel!.id
        : scope === "role"
        ? role?.id
        : scope === "member"
        ? `${interaction.guild!.id}:${interaction.user.id}`
        : interaction.user.id;

    interaction.client.db.hSet(scope, {
      name,
      url: file.url,
    });

    // Do something with the file
    await interaction.reply(`Created new soundboard button: ${name}`);
  },
});

export default commands;
