import { Client, Guild, REST, Routes } from "discord.js";
import { DISCORD_CLIENT_ID, DISCORD_TOKEN } from "./config";
import { getCommands } from "./commands";

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

export const syncCommands = async (guild: Guild) => {
  const commands = await getCommands();

  const commandsJSON = await Promise.all(
    commands.map((c) => c.data(guild).then((r) => r.toJSON()))
  );

  rest
    .put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guild.id), {
      body: commandsJSON,
    })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
};

export const syncAllCommands = async (client: Client) => {
  for (const guild of client.guilds.cache.map((g) => g)) {
    await syncCommands(guild);
  }
};
