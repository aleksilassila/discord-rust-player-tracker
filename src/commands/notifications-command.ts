import { SlashCommand } from "./slash-command";
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import Notifications from "../models/Notifications";
import { messages } from "../messages";

class NotificationsCommand extends SlashCommand {
  async data(guildId: string): Promise<SlashCommandSubcommandsOnlyBuilder> {
    return new SlashCommandBuilder()
      .setName("notifications")
      .setDescription("Manage player notifications")
      .setDMPermission(false)
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

    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        ephemeral: true,
        content: messages.guildRequired,
      });
      return;
    }

    if (subcommand === "enable") {
      await Notifications.enableNotifications(interaction.user.id, guild.id);
      await interaction.reply({
        content: messages.allNotificationsEnabled,
        ephemeral: true,
      });
    } else if (subcommand === "disable") {
      await Notifications.disableNotifications(
        interaction.user.id,
        interaction.guild.id
      );
      await interaction.reply({
        content: messages.allNotificationsDisabled,
        ephemeral: true,
      });
    }
  }
}

export default NotificationsCommand;
