import { Client, ClientOptions } from "discord.js";
import { Redis, RedisOptions } from "ioredis";

interface SoundboarderOptions {
  discord: ClientOptions;
  redis: string | number | RedisOptions;
}

export default class Soundboarder extends Client {
  constructor(options: SoundboarderOptions) {
    super(options.discord);

    this.on("ready", () => {
      if (!this.user) return;
      console.log(`Logged in as ${this.user.tag}`);
    });

    // @ts-ignore
    this.db = new Redis(options.redis);
    this.db.on("connecting", () => console.debug("Connecting to Redis"));
    this.db.on("connect", () => console.log("Connected to Redis"));

    this.db.on("error", (error) => console.error("Redis error:", error));
  }

  db: Redis;
}
