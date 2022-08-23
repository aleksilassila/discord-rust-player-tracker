import { SlashCommand } from "./slash-command";
import {
  bold,
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandBuilder,
} from "discord.js";
import {
  getPlayerInfo,
  PlayerInfo,
} from "../apis/battemetrics/get-player-info";
import Player from "../models/Player";
import Guild from "../models/Guild";
import prisma from "../prisma";

class Track implements SlashCommand {
  async data(guild: DiscordGuild): Promise<any> {
    const removeChoices = await prisma.guildPlayerTracks
      .findMany({
        where: {
          guildId: guild.id,
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
          .addNumberOption((option) =>
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
              .setName("player-id")
              .setDescription("Player nickname")
              .setRequired(true)
              .addChoices(...removeChoices)
          )
      )
      .addSubcommand((command) =>
        command.setName("list").setDescription("List tracked players")
      )
      .addSubcommand((command) =>
        command
          .setName("report")
          .setDescription(
            "Get a report of tracked players that keeps updating. Only the latest report will be kept up to date."
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
      return this.executeList(interaction, interaction.guild);
    } else if (subcommand === "report") {
      return this.executeReport(interaction, interaction.guild);
    }

    if (subcommand === "add") {
      const playerId = interaction.options.getNumber("player-id");

      if (!playerId) {
        await interaction.reply("Player id is required");
        return;
      }
      return this.executeAdd(
        interaction,
        playerId.toString(),
        interaction.guild
      );
    } else if (subcommand === "remove") {
      const playerId = interaction.options.getString("player-id");

      if (!playerId) {
        await interaction.reply("Nickname is required.");
        return;
      }

      return this.executeRemove(interaction, playerId, interaction.guild);
    } else {
      await interaction.reply("Invalid subcommand");
    }
  }

  async executeAdd(
    interaction: ChatInputCommandInteraction,
    playerId: string,
    guild: DiscordGuild
  ): Promise<void> {
    const playerInfo: PlayerInfo | void = await getPlayerInfo(playerId).catch(
      console.error
    );

    if (!playerInfo) {
      await interaction.reply("Could not fetch the player");
      return;
    }

    const playerNickname =
      interaction.options.getString("nickname") || playerInfo.attributes.name;

    Player.createPlayer(playerInfo, guild, playerNickname)
      .then(
        async () =>
          await interaction.reply({
            content: `Added player ${bold(playerInfo.attributes.name)} (${
              playerInfo.id
            }) as ${bold(playerNickname)}`,
          })
      )
      .catch(async (err) => {
        await interaction.reply("Error adding player");
        console.error(err);
      });
  }

  async executeRemove(
    interaction: ChatInputCommandInteraction,
    playerId: string,
    guild: DiscordGuild
  ): Promise<void> {
    await Player.untrackPlayer(playerId, guild).then((b) =>
      interaction.reply(b ? "Removed player" : "Player not found")
    );
  }

  async executeList(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild
  ): Promise<void> {
    const players = await prisma.guildPlayerTracks
      .findMany({
        where: {
          guildId: guild.id,
        },
        include: {
          player: true,
        },
      })
      .then((tracks) => tracks.map((track) => track.player));

    await interaction.reply(
      `${players.length} players tracked:\n${players
        .map((player) => `> ${bold(player.name)} (${player.id})`)
        .join("\n")}`
    );
  }

  async executeReport(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild
  ): Promise<void> {
    const reply = await interaction
      .reply(await Guild.getTrackReport(guild.id))
      .then(async (r) => await interaction.fetchReply());

    await prisma.persistentMessage.upsert({
      where: {
        guildId: guild.id,
      },
      update: {
        id: reply.id,
      },
      create: {
        id: reply.id,
        guildId: guild.id,
      },
    });
  }
}

export default Track;
