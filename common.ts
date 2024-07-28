import { Interaction, Role } from "discord.js";
import { createClient } from "redis";

// https://dev.to/alexanderop/implementing-a-custom-includes-utility-type-in-typescript-4dph
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type Includes<T extends readonly any[], U> = T extends [infer First, ...infer Rest]
  ? Equal<First, U> extends true
    ? true
    : Includes<Rest, U>
  : false;

export type Scope = "guild" | "channel" | "role" | "member" | "user";
export type RedisClient = ReturnType<typeof createClient>;
type URL = string;

export interface Button {
  name: string;
  file: URL;
  emoji: string;
}

export async function getButtons(
  db: RedisClient,
  interaction: Interaction,

  scopes?: Scope[],
  roles?: Role[]
): Promise<Button[]> {
  const buttons: Button[] = [];

  if (scopes === undefined) scopes = ["user"];
  if (scopes.includes("role") && !roles?.length) throw new Error("Role scope requires at least a role.");

  for (const scope of scopes) {
    if (scope === "role") {
      for (const role of roles!) buttons.push(...(await db.lRange(role.id, 0, -1)).map((button) => JSON.parse(button)));

      continue;
    }

    buttons.push(
      ...(
        await db.lRange(
          scope === "guild"
            ? interaction.guild!.id
            : scope === "channel"
            ? // @ts-ignore ts is not that smart yet
              interaction.member.voice.channel.id
            : scope === "member"
            ? `${interaction.guild!.id}-${interaction.user.id}`
            : interaction.user.id,
          0,
          -1
        )
      ).map((button) => JSON.parse(button))
    );
  }

  return buttons;
}
