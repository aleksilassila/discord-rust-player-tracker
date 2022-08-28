import { SubcommandWithGuild } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import Notifications from "../../models/Notifications";
import { messages } from "../../messages";

class NotificationsEnable extends SubcommandWithGuild {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Enable all player notifications");
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: Guild
  ): Promise<void> {
    await Notifications.enableNotifications(interaction.user.id, guild.id);
    await this.reply(interaction, {
      content: messages.allNotificationsEnabled,
      ephemeral: true,
    });
  }

  getName(): string {
    return "enable";
  }
}
export default NotificationsEnable;
