// @ts-nocheck

import generateWeatherImageFromCity from "../../functions/generate.weather.js";

const command = {
  name: "weather",
  aliases: ["clima"],
  description: "Obtém informações sobre o clima atual.",
  args_length: 1,
  args: "<lugar>",
  admin_only: false,
  group_admin_only: false,
  group_only: false,

  /**
   * @param {{ client: import('@open-wa/wa-automate').Client, message: import("@open-wa/wa-automate").Message, args: string[], prisma: import("@prisma/client").PrismaClient, prefix: string }} param0
   */
  execute: async ({ client, message, args, prefix, prisma }) => {
    try {
      const image = await generateWeatherImageFromCity(args.join(" "));
      client.sendImage(
        message.chat.id,

        image,
        "weather.png",
        "",
        message.id
      );
    } catch (error) {}
  },
};

export default command;
