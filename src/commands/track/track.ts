import { SlashCommand } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandBuilder,
} from "discord.js";
import {
  getPlayerInfo,
  PlayerInfo,
} from "../../apis/battemetrics/get-player-info";
import Player from "../../models/Player";
import Guild from "../../models/Guild";
import prisma from "../../prisma";
import { messages } from "../../messages";
import { executeRemove } from "./remove";
import { executeInfo } from "./info";
import { executeAdd } from "./add";
import { executeStats } from "./stats";
import { executeList } from "./list";

class Track implements SlashCommand {
  async data(guildId: string): Promise<any> {
    const removeChoices = await prisma.guildPlayerTracks
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
      .setDescription("Track a rust player based on their Battlemetrics id")
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
          .addStringOption((option) =>
            option
              .setName("nickname")
              .setDescription("Player nickname")
              .setRequired(false)
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
              .addChoices(...removeChoices)
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
              .addChoices(...removeChoices)
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
          .setName("stats")
          .setDescription(
            "Get a track stats report of tracked players that is kept up to date."
          )
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guild) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    if (subcommand === "list") {
      return executeList(interaction, interaction.guild);
    } else if (subcommand === "stats") {
      return executeStats(interaction, interaction.guild);
    }

    if (subcommand === "add") {
      const playerId = interaction.options.getInteger("player-id");

      if (!playerId) {
        await interaction.reply(messages.playerIdRequired);
        return;
      }

      return executeAdd(interaction, playerId.toString(), interaction.guild);
    } else if (subcommand === "remove" || subcommand === "info") {
      const playerId =
        interaction.options.getString("nickname") ||
        interaction.options.getInteger("player-id")?.toString();

      if (!playerId) {
        await interaction.reply(messages.nicknameRequired);
        return;
      }

      if (subcommand === "remove")
        return executeRemove(interaction, playerId, interaction.guild);
      else return executeInfo(interaction, playerId, interaction.guild);
    } else {
      await interaction.reply("Invalid subcommand");
    }
  }
}

export default Track;
