import { SubcommandWithChannel } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from "discord.js";
import Notifications from "../../models/Notifications";
import { messages } from "../../messages";

class NotificationsEnable extends SubcommandWithChannel {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Enable all player notifications");
  }

  async executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: Guild,
    channel: TextChannel
  ): Promise<void> {
    const guildServer = await this.requireGuildServer(interaction, channel);
    if (!guildServer) return;

    const user = await this.requireUser(interaction);
    if (!user) return;

    await Notifications.enableNotifications(user, guildServer);

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
