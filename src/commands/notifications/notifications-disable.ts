import { SubcommandWithGuild } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import Notifications from "../../models/Notifications";
import { messages } from "../../messages";

class NotificationsDisable extends SubcommandWithGuild {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Disable all player notifications");
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: Guild
  ): Promise<void> {
    await Notifications.disableNotifications(interaction.user.id, guild.id);

    await this.reply(interaction, {
      content: messages.allNotificationsDisabled,
      ephemeral: true,
    });
  }

  getName(): string {
    return "disable";
  }
}
export default NotificationsDisable;
