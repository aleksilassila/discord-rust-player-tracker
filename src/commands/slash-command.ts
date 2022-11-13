import {
  ChatInputCommandInteraction,
  Guild,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  TextChannel,
} from "discord.js";
import GuildModel, { GuildServerFull } from "../models/Guild";
import Player, { PlayerModel } from "../models/Player";
import prisma from "../prisma";
import { User } from "@prisma/client";

export abstract class CommandAbstract {
  abstract getName(): string;
  async executeCommand(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    if (this.shouldDelayResponses()) {
      await interaction.deferReply({ ephemeral: this.shouldReplyEphemeral() });
    }

    return await this.execute(interaction);
  }

  protected abstract execute(
    interaction: ChatInputCommandInteraction
  ): Promise<void>;

  shouldDelayResponses() {
    return false;
  }

  shouldReplyEphemeral() {
    return false;
  }

  private getReplyObject(reply: InteractionReplyOptions | string) {
    if (typeof reply === "string") {
      return { content: reply, ephemeral: this.shouldReplyEphemeral() };
    } else {
      return { ephemeral: this.shouldReplyEphemeral(), ...reply };
    }
  }

  async reply(
    interaction: ChatInputCommandInteraction,
    reply: InteractionReplyOptions | string
  ): Promise<void | Message | InteractionResponse> {
    if (this.shouldDelayResponses()) {
      return interaction
        .editReply(this.getReplyObject(reply))
        .catch(console.error);
    } else {
      return interaction.reply(this.getReplyObject(reply)).catch(console.error);
    }
  }

  async replyEphemeral(
    interaction: ChatInputCommandInteraction,
    reply: InteractionReplyOptions | string
  ): Promise<void | Message | InteractionResponse> {
    return this.reply(interaction, {
      ...(typeof reply === "string" ? { content: reply } : reply),
      ephemeral: true,
    });
  }

  async requireGuild(
    interaction: ChatInputCommandInteraction
  ): Promise<Guild | null> {
    const guild = interaction.guild;
    if (!guild)
      await this.replyEphemeral(
        interaction,
        "This command can only be used in a server."
      );
    return guild;
  }

  async requireGuildTextChannel(
    interaction: ChatInputCommandInteraction
  ): Promise<TextChannel | undefined> {
    const channel = interaction.channel;
    if (!channel) {
      await this.replyEphemeral(
        interaction,
        "This command can only be used in server's text channel."
      );
      return;
    }
    return <TextChannel>channel;
  }

  async requireGuildServer(
    interaction: ChatInputCommandInteraction,
    channel: TextChannel
  ): Promise<GuildServerFull | undefined> {
    const guildServer = await GuildModel.getGuildServer(channel);
    if (!guildServer)
      await this.replyEphemeral(
        interaction,
        "This command can only be used in server's text channel."
      );
    return guildServer;
  }

  async requirePlayerId(
    interaction: ChatInputCommandInteraction
  ): Promise<string | undefined> {
    const playerId =
      interaction.options.getString("nickname") ||
      interaction.options.getInteger("player-id")?.toString();

    if (!playerId) {
      await this.replyEphemeral(
        interaction,
        "This command requires target player."
      );
    }

    return playerId;
  }

  async requirePlayer(
    interaction: ChatInputCommandInteraction
  ): Promise<PlayerModel | undefined> {
    const playerId = await this.requirePlayerId(interaction);

    if (!playerId) {
      return;
    }

    const player = await Player.updateOrCreate(playerId);

    if (!player) {
      await this.replyEphemeral(interaction, "Could not fetch target player.");
      return;
    }

    return player;
  }

  async requireServerId(interaction: ChatInputCommandInteraction) {
    const serverId = interaction.options.getInteger("server-id")?.toString();
    if (!serverId) {
      await this.replyEphemeral(interaction, "Server id is required.");
    }
    return serverId;
  }

  async requireUser(
    interaction: ChatInputCommandInteraction
  ): Promise<User | undefined> {
    const user =
      (await prisma.user
        .upsert({
          where: {
            id: interaction.user.id,
          },
          update: {},
          create: {
            id: interaction.user.id,
          },
        })
        .catch(console.error)) || undefined;

    if (!user) {
      await this.replyEphemeral(
        interaction,
        "Could not fetch your user account."
      );
    }

    return user;
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
        await subcommand.executeCommand(interaction);
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
    await this.executeWithGuild(interaction, guild);
  }

  abstract executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: Guild
  ): Promise<void>;
}

export abstract class SubcommandWithChannel extends SubcommandWithGuild {
  shouldReplyEphemeral(): boolean {
    return true;
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: Guild
  ): Promise<void> {
    const channel = await this.requireGuildTextChannel(interaction);
    if (!channel) return;
    await this.executeWithChannel(interaction, guild, channel);
  }

  abstract executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: Guild,
    channel: TextChannel
  ): Promise<void>;
}
