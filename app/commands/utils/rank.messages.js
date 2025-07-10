const command = {
  name: "rank",
  aliases: [],
  description: "Mostra o ranking de mensagens no grupo.",
  admin_only: false,
  group_admin_only: false,
  group_only: true,

  execute: async ({ client, message, prisma }) => {
    const user = await prisma.user.findFirst({
      where: { id: message.sender.id },
    });

    if (!user) {
      return client.sendText(
        message.chat.id,
        "Usuário não encontrado no banco."
      );
    }

    const group = await prisma.group.findFirst({
      where: { group_id: message.chat.id },
    });

    if (!group) {
      return client.sendText(message.chat.id, "Grupo não encontrado no banco.");
    }

    const groupUsers = await prisma.groupUser.findMany({
      where: {
        group_id: group.database_id, // corrigido de group.database_id
      },
      orderBy: {
        messages: "desc", // assumindo que o campo é "messages"
      },
      take: 10,
    });

    if (!groupUsers.length) {
      return client.sendText(
        message.chat.id,
        "Nenhum dado de mensagem encontrado neste grupo."
      );
    }

    const ranking = groupUsers
      .map((gu, index) => {
        console.log(gu);
      })
      .join("\n");

    await client.sendText(
      message.chat.id,
      `📊 *Ranking de mensagens:*\n\n${ranking}`
    );
  },
};

export default command;
