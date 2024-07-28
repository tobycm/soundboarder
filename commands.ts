import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

interface Command {
  data: SlashCommandBuilder;

  run: (interaction: ChatInputCommandInteraction) => any | Promise<any>;
  completion?: (interaction: AutocompleteInteraction) => any | Promise<any>;
}

const commands: Command[] = [
  {
    data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
    run: async (interaction) => {
      await interaction.reply("Pong!");
    },
  },
];

export default commands;
