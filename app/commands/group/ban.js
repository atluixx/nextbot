const command = {
  name: 'ban',
  aliases: [],
  description: 'Remove um membro do grupo (@usuário ou número).',
  admin_only: true,
  group_admin_only: true,
  group_only: true,

  execute: async ({ client, message, prisma, args }) => {
    const target = await client.findUser({ input: args.join(' '), message });

    if (!target) {
      return client.reply(
        message.chat.id,
        '❌ Usuário não encontrado. Use: `/ban @usuário` ou `/ban número`.',
        message.id
      );
    }

    try {
      const success = await client.removeParticipant(
        message.chat.id,
        target.id
      );

      if (success) {
        await client.reply(
          message.chat.id,
          `✅ O membro *${target.id.replace(
            '@c.us',
            ''
          )}* foi removido do grupo com sucesso.`,
          message.id
        );
      } else {
        await client.reply(
          message.chat.id,
          '⚠️ Não foi possível remover o usuário. Verifique se o bot possui permissões de administrador.',
          message.id
        );
      }
    } catch (err) {
      console.error(err);
      await client.reply(
        message.chat.id,
        `❌ Ocorreu um erro ao tentar remover o usuário:\n\`\`\`${err.message}\`\`\``,
        message.id
      );
    }
  },
};

export default command;
