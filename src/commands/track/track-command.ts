import { SlashCommand } from "../slash-command";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import prisma from "../../prisma";
import { messages } from "../../messages";
import { executeRemove } from "./track-remove";
import { executeInfo } from "./track-info";
import { executeAdd } from "./track-add";
import { executeList } from "./track-list";
import executeOverview from "./track-overview";

class TrackCommand implements SlashCommand {
  async data(guildId: string): Promise<any> {
    const nicknameChoices = await prisma.guildPlayerTracks
      .findMany({
        where: {
          guildId,
        },
      })
      .then((users) =>
        users.map((user) => ({
          name: user.nickname,
          value: user.playerId,
        }))
      );

    return new SlashCommandBuilder()
      .setName("track")
      .setDescription(
        "TrackCommand a rust player based on their Battlemetrics id"
      )
      .setDMPermission(false)
      .addSubcommand((command) =>
        command
          .setName("add")
          .setDescription("Add player to track list")
          .addIntegerOption((option) =>
            option
              .setName("player-id")
              .setDescription("Player Battlemetrics id")
              .setRequired(true)
          )
      )
      .addSubcommand((command) =>
        command
          .setName("remove")
          .setDescription("Remove player from track list")
          .addStringOption((option) =>
            option
              .setName("nickname")
              .setDescription("Player nickname")
              .addChoices(...nicknameChoices)
          )
          .addNumberOption((option) =>
            option
              .setName("player-id")
              .setDescription("Player Battlemetrics id")
          )
      )
      .addSubcommand((command) =>
        command
          .setName("info")
          .setDescription("Get info about specific player")
          .addStringOption((option) =>
            option
              .setName("nickname")
              .setDescription("Player nickname")
              .addChoices(...nicknameChoices)
          )
          .addNumberOption((option) =>
            option
              .setName("player-id")
              .setDescription("Player Battlemetrics id")
          )
      )
      .addSubcommand((command) =>
        command.setName("list").setDescription("List tracked players")
      )
      .addSubcommand((command) =>
        command
          .setName("overview")
          .setDescription(
            "Get an overview of all tracked players that is kept up to date."
          )
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const playerId =
      interaction.options.getString("nickname") ||
      interaction.options.getInteger("player-id")?.toString();

    if (!interaction.guild) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    if (!playerId && ["add", "remove", "info"].includes(subcommand)) {
      await interaction.reply(messages.playerRequired);
      return;
    }

    switch (subcommand) {
      case "list":
        return executeList(interaction, interaction.guild);

      case "overview":
        return executeOverview(interaction, interaction.guild);

      case "add":
        return executeAdd(interaction, <string>playerId, interaction.guild);

      case "remove":
        return executeRemove(interaction, <string>playerId, interaction.guild);

      case "info":
        return executeInfo(interaction, <string>playerId, interaction.guild);

      default:
        await interaction.reply("Invalid subcommand");
    }
  }
}

export default TrackCommand;
