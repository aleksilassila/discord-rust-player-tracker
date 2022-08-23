import { SlashCommand } from "./slash-command";
import {
  bold,
  ChatInputCommandInteraction,
  Guild,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import prisma from "../prisma";
import Notifications from "../models/Notifications";
import { messages } from "../messages";

class NotificationsCommand extends SlashCommand {
  async data(guild: Guild): Promise<SlashCommandSubcommandsOnlyBuilder> {
    const addRemoveChoices = await prisma.guildPlayerTracks
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
      .setName("notifications")
      .setDescription("Manage player notifications")
      .addSubcommand((command) =>
        command
          .setName("add")
          .setDescription("Request notifications for this player")
          .addStringOption((option) =>
            option
              .setName("nickname")
              .setDescription("Player nickname")
              .setRequired(true)
              .addChoices(...addRemoveChoices)
          )
      )
      .addSubcommand((command) =>
        command
          .setName("remove")
          .setDescription("Unsubscribe from player notifications")
          .addStringOption((option) =>
            option
              .setName("nickname")
              .setDescription("Player nickname")
              .setRequired(true)
              .addChoices(...addRemoveChoices)
          )
      )
      .addSubcommand((command) =>
        command.setName("list").setDescription("List notifications")
      )
      .addSubcommand((command) =>
        command
          .setName("enable")
          .setDescription("Enable all player notifications")
      )
      .addSubcommand((command) =>
        command
          .setName("disable")
          .setDescription("Disable all player notifications")
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      const players = await prisma.userPlayerNotification
        .findMany({
          where: {
            userId: interaction.user.id,
          },
          include: {
            player: true,
          },
        })
        .then((ns) => ns.map((n) => n.player));

      const user = await prisma.user.findUnique({
        where: {
          id: interaction.user.id,
        },
      });

      await interaction.reply({
        content: messages.listNotifications(
          !!user && user.enableNotifications,
          players
        ),
        ephemeral: true,
      });
      return;
    } else if (subcommand === "enable") {
      await Notifications.enableNotifications(interaction.user.id);
      await interaction.reply({
        content: messages.allNotificationsEnabled,
        ephemeral: true,
      });
      return;
    } else if (subcommand === "disable") {
      await Notifications.disableNotifications(interaction.user.id);
      await interaction.reply({
        content: messages.allNotificationsDisabled,
        ephemeral: true,
      });
      return;
    }

    const playerId = interaction.options.getString("nickname");

    if (!playerId) {
      await interaction.reply({
        content: messages.nicknameRequired,
        ephemeral: true,
      });
      return;
    }

    const targetPlayer = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });

    if (!targetPlayer) {
      await interaction.reply({
        content: messages.playerNotFound,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "add") {
      await Notifications.addNotification(playerId, interaction.user.id);
      await interaction.reply({
        content: messages.playerNotificationsEnabled(targetPlayer.name),
        ephemeral: true,
      });
      return;
    } else if (subcommand === "remove") {
      await Notifications.removeNotification(playerId, interaction.user.id);
      await interaction.reply({
        content: messages.playerNotificationsDisabled(targetPlayer.name),
        ephemeral: true,
      });
      return;
    }
  }
}

export default NotificationsCommand;
