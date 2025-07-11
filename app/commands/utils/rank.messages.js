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
        group_id: group.database_id,
      },
      orderBy: {
        messages: "desc",
      },
      take: 10,
    });

    if (!groupUsers.length) {
      return client.sendText(
        message.chat.id,
        "Nenhum dado de mensagem encontrado neste grupo."
      );
    }

    const rankingLines = await Promise.all(
      groupUsers.map(async (gu, index) => {
        const user = await prisma.user.findFirst({
          where: { database_id: gu.user_id },
        });

        const name = user?.name || "Usuário desconhecido";
        return `${index + 1}. ${name} — ${gu.messages} mensagens`;
      })
    );

    const ranking = rankingLines.join("\n");

    await client.sendText(
      message.chat.id,
      `📊 *Ranking de mensagens:*\n\n${ranking}`
    );
  },
};

export default command;
