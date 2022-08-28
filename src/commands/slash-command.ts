import {
  ChatInputCommandInteraction,
  CommandInteraction,
  Guild,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { messages } from "../messages";

export abstract class CommandAbstract {
  abstract getName(): string;
  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;

  shouldDelayResponses() {
    return false;
  }

  async reply(
    interaction: ChatInputCommandInteraction,
    reply: InteractionReplyOptions | string
  ): Promise<void | Message | InteractionResponse> {
    if (this.shouldDelayResponses()) {
      return interaction.editReply(reply).catch(console.error);
    } else {
      return interaction.reply(reply).catch(console.error);
    }
  }

  async requireGuild(
    interaction: ChatInputCommandInteraction
  ): Promise<Guild | null> {
    const guild = interaction.guild;
    if (!guild)
      await interaction.reply("This command can only be used in a server.");
    return guild;
  }

  async requirePlayerId(
    interaction: ChatInputCommandInteraction
  ): Promise<string | undefined> {
    const playerId =
      interaction.options.getString("nickname") ||
      interaction.options.getInteger("player-id")?.toString();

    if (!playerId) {
      await interaction.reply("This command ");
    }

    return playerId;
  }

  async requireServerId(interaction: ChatInputCommandInteraction) {
    const serverId = interaction.options.getInteger("server-id")?.toString();
    if (!serverId) {
      await this.reply(interaction, "Server id is required.");
    }
    return serverId;
  }
}

export abstract class Command extends CommandAbstract {
  abstract buildCommand(): Promise<
    SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
  >;
}

export abstract class CommandWithSubcommands extends Command {
  abstract getSubcommands(): Subcommand[];

  abstract buildCommandWithSubcommands(
    builderWithName: SlashCommandBuilder
  ): Promise<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder>;

  async buildCommand(): Promise<
    SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
  > {
    let builder = await this.buildCommandWithSubcommands(
      new SlashCommandBuilder().setName(this.getName())
    );

    for (const subcommand of this.getSubcommands()) {
      builder = builder.addSubcommand((command) =>
        subcommand.buildSubcommand(command).setName(subcommand.getName())
      );
    }

    return builder;
  }

  async executeSubcommand(interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getSubcommand();

    for (const subcommand of this.getSubcommands()) {
      if (subcommand.getName() === input) {
        await subcommand.execute(interaction);
        return;
      }
    }

    await this.reply(interaction, "Subcommand not found.");
  }
}

export abstract class Subcommand extends CommandAbstract {
  abstract buildSubcommand(
    builderWithName: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder;
}

export abstract class SubcommandWithGuild extends Subcommand {
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = await this.requireGuild(interaction);
    if (!guild) return;
  }

  abstract executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: Guild
  ): Promise<void>;
}
