export default {
  name: 'add',
  description: 'Readiciona um membro ao grupo (@usuário ou número).',
  admin_only: true,
  group_admin_only: true,
  group_only: true,

  execute: async ({ client, message, prisma, args }) => {
    const input = args.join(' ');
    let target = await client.findUser({ input, message });

    if (!target) {
      return client.reply(
        message.chat.id,
        '❌ Usuário não encontrado. Use: `/unban @usuário` ou `/unban número`.',
        message.id
      );
    }

    target = await client.getContact(target.id);

    try {
      const res = await client.addParticipant(message.chat.id, target.id);
      console.log(res);
      switch (res) {
        case true:
          await client.reply(
            message.chat.id,
            `✅ O membro *${target.id.replace(
              '@c.us',
              ''
            )}* foi readicionado com sucesso.`,
            message.id
          );
          break;
        case 'NOT_A_CONTACT':
          await client.reply(
            message.chat.id,
            '⚠️ Não posso adicionar esse usuário porque ele não está nos seus contatos.',
            message.id
          );
          break;
        case 'INSUFFICIENT_PERMISSIONS':
          await client.reply(
            message.chat.id,
            '⚠️ Não tenho permissão para adicionar membros. Verifique se sou administrador.',
            message.id
          );
          break;
        default:
          await client.reply(
            message.chat.id,
            `❌ Não foi possível adicionar o usuário. Código retornado: \`${res}\`.`,
            message.id
          );
      }
    } catch (err) {
      console.error(err);
      await client.reply(
        message.chat.id,
        `❌ Erro ao tentar adicionar usuário:\n\`\`\`${err.message}\`\`\``,
        message.id
      );
    }
  },
};
