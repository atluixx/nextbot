const command = {
  name: "eval",
  aliases: ["ev"],
  description: "Executa código JavaScript.",
  args_length: 1,
  args: "<código>",
  admin_only: true,
  group_admin_only: true,
  group_only: false,

  /**
   * @param {{ client: import('@open-wa/wa-automate').Client, message: import("@open-wa/wa-automate").Message, args: string[], prisma: import("@prisma/client").PrismaClient, prefix: string }} param0
   */
  execute: async ({ client, message, args, prefix, prisma }) => {
    if (!args || args.length < command.args_length) {
      return client.reply(
        message.chat.id,
        // @ts-ignore
        client.messages.moderation.missing_args({
          username: message.sender.pushname || "Usuário",
          command: command.name,
          prefix: prefix,
          args: command.args,
        }),
        message.id
      );
    }

    try {
      const code = args.join(" ");
      const result = await eval(`(async () => { ${code} })()`);

      let output = result;
      if (typeof result !== "string") {
        output = (await import("util")).inspect(result);
      }

      await client.reply(
        message.sender.id,
        `🧠 Resultado:\n\`\`\`\n${output}\n\`\`\``,
        message.id
      );
    } catch (err) {
      await client.reply(
        message.sender.id,
        `❌ Erro:\n\`\`\`\n${err.message}\n\`\`\``,
        message.id
      );
    }
  },
};

export default command;
