import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, Interaction, Role } from "discord.js";
import { Redis } from "ioredis";

// https://dev.to/alexanderop/implementing-a-custom-includes-utility-type-in-typescript-4dph
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type Includes<T extends readonly any[], U> = T extends [infer First, ...infer Rest]
  ? Equal<First, U> extends true
    ? true
    : Includes<Rest, U>
  : false;

export type Scope = "guild" | "channel" | "role" | "member" | "user";
type URL = string;

export interface DBButton {
  file: URL;
  emoji: string;
}
export interface Button extends DBButton {
  id: string;
  name: string;
}

interface GetButtonOptions {
  scopes?: Scope[];
  roles?: Role[];

  offset?: number;
  limit?: number;
}

export async function getButtons(
  db: Redis,
  interaction: Interaction,

  options: GetButtonOptions = {}
): Promise<Button[]> {
  const buttons: Button[] = [];

  let { scopes } = options;

  if (scopes === undefined) scopes = ["user"];

  if ((scopes.length !== 1 || !scopes.includes("user")) && !interaction.guild) throw new Error("Guild scopes requires a guild.");

  if (scopes.includes("role") && !options.roles?.length) throw new Error("Role scope requires at least a role.");

  const buttonKeys: string[] = [];

  for (const scope of scopes) {
    if (scope === "role") {
      for (const role of options.roles) {
        const keys = await db.scan(0, "MATCH", `${interaction.guild!.id}.${role.id}:*`);
        if (keys[1].length === 0) continue;

        buttonKeys.push(...keys[1]);
      }

      continue;
    }

    const keys = await db.scan(
      0,
      "MATCH",
      `${
        scope === "guild"
          ? interaction.guild!.id
          : scope === "channel"
          ? (interaction.member as GuildMember).voice.channel!.id
          : scope === "member"
          ? `${interaction.guild!.id}.${interaction.user.id}`
          : interaction.user.id
      }:*`
    );
    if (keys[1].length === 0) continue;

    buttonKeys.push(...keys[1]);
  }

  const offset = options.offset ?? 0;

  for (const key of buttonKeys.slice(offset, options.limit ? offset + options.limit : undefined))
    buttons.push({
      id: key,
      name: key.split(":")[1],
      ...((await db.hgetall(key)) as unknown as DBButton),
    });

  return buttons;
}

interface MakeSoundboardOptions {
  style?: ButtonStyle;

  offset?: number;
}

export function makeSoundboard(buttons: Button[], options: MakeSoundboardOptions = {}): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();

  for (const button of buttons) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(button.id)
        .setLabel(button.name)
        .setStyle(options.style ?? ButtonStyle.Primary)
        .setEmoji(button.emoji)
    );
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder<ButtonBuilder>();
    }
  }

  if (row.components.length > 0) rows.push(row);

  return rows;
}
