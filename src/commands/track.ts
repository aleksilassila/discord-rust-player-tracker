import { SlashCommand } from "./slash-command";
import {
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
import { messages } from "../messages";

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
      return this.executeList(interaction, interaction.guild);
    } else if (subcommand === "stats") {
      return this.executeStats(interaction, interaction.guild);
    }

    if (subcommand === "add") {
      const playerId = interaction.options.getInteger("player-id");

      if (!playerId) {
        await interaction.reply(messages.playerIdRequired);
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
        await interaction.reply(messages.nicknameRequired);
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

    Player.createPlayer(playerInfo)
      .then(async () => {
        await Guild.trackPlayer(guild.id, playerId, playerNickname);
        await interaction.reply({
          content: messages.trackPlayer(
            playerInfo.attributes.name,
            playerInfo.id,
            playerNickname
          ),
        });
      })
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
    await Guild.untrackPlayer(guild.id, playerId).then((b) =>
      interaction.reply(b ? messages.untrackPlayer : messages.playerNotFound)
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

    await interaction.reply(messages.listTrackedPlayers(players));
  }

  async executeStats(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild
  ): Promise<void> {
    const reply = await interaction
      .reply(await Guild.getPersistentMessage(guild))
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
