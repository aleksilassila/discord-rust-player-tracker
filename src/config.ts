require("dotenv").config();

export const BATTLEMETRICS_TOKEN = process.env.BATTLEMETRICS_TOKEN || "";
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
export const DISCORD_CLIENT_ID =
  process.env.DISCORD_CLIENT_ID || "1010612547239563387";

export const SESSIONS_REFRESH_TIME = 5 * 60 * 1000;
export const SERVER_REFRESH_TIME = 15 * 60 * 1000;
