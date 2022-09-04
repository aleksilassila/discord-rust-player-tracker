import { SubcommandWithChannel } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from "discord.js";
import Notifications from "../../models/Notifications";
import { messages } from "../../messages";

class NotificationsDisable extends SubcommandWithChannel {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Disable all player notifications");
  }

  async executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: Guild,
    channel: TextChannel
  ): Promise<void> {
    const guildServer = await this.requireGuildServer(interaction, channel);
    const user = await this.requireUser(interaction);
    if (!guildServer || !user) return;

    await Notifications.disableNotifications(user, guildServer);

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
