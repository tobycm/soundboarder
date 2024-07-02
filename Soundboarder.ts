import { Client, ClientOptions } from "discord.js";
import { INode, IOptions, MoonlinkManager } from "moonlink.js";

interface SoundboarderOptions {
  discord: ClientOptions;
  moonlink: {
    nodes: INode[];
    options: IOptions;
    SPayload: Function;
  };
}

export default class Soundboarder extends Client {
  constructor(options: SoundboarderOptions) {
    super(options.discord);

    this.on("ready", () => {
      if (!this.user) return;
      console.log(`Logged in as ${this.user.tag}`);
      this.moon.init(this.user.id);
    });

    this.on("raw", (data) => this.moon.packetUpdate(data));

    this.moon = new MoonlinkManager(options.moonlink.nodes, options.moonlink.options, options.moonlink.SPayload);

    this.moon.on("nodeCreate", (node) => console.log(`${node.host} was connected`));
  }

  moon: MoonlinkManager;
}
