import { SlashCommand } from "./slash-command";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import Guild from "../models/Guild";
import { messages } from "../messages";

class Server implements SlashCommand {
  async data(guildId: string): Promise<any> {
    return new SlashCommandBuilder()
      .setName("server")
      .setDescription("Set rust server to track.")
      .addSubcommand((command) =>
        command
          .setName("set")
          .setDescription("Set server to track based on its Battlemetrics id.")
          .addIntegerOption((option) =>
            option
              .setName("server-id")
              .setDescription("Server Battlemetrics id.")
              .setRequired(true)
          )
      )
      .addSubcommand((command) =>
        command.setName("unset").setDescription("Remove tracked server.")
      )
      .addSubcommand((command) =>
        command
          .setName("info")
          .setDescription("Show info about the tracked server.")
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guild) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const serverId = interaction.options.getInteger("server-id")?.toString();

    if (subcommand === "info") {
      await interaction.reply("Not implemented.");
      return;
    }

    if (!serverId) {
      await interaction.reply("Server id is required.");
      return;
    }

    if (subcommand === "set") {
      await Guild.setTrackedServer(interaction.guild.id, serverId);
    } else if (subcommand === "unset") {
      await Guild.setTrackedServer(interaction.guild.id);
    }

    await interaction.reply(
      serverId === null || subcommand === "unset"
        ? messages.unsetTrackedServer
        : messages.setTrackedServer
    );
  }
}

export default Server;
