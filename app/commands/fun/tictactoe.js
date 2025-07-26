// @ts-nocheck

import { renderFlatMinimalTicTacToe } from "../../functions/render.ttt.js";

const games = new Map();
const pendingConfirmations = new Map();

function checkWinner(board) {
  const lines = [
    [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  ];
  for (const line of lines) {
    const [[a1, b1], [a2, b2], [a3, b3]] = line;
    if (
      board[a1][b1] &&
      board[a1][b1] === board[a2][b2] &&
      board[a1][b1] === board[a3][b3]
    ) {
      return { winner: board[a1][b1] };
    }
  }
  return null;
}

function numberToPosition(num) {
  const map = {
    1: [0, 0],
    2: [0, 1],
    3: [0, 2],
    4: [1, 0],
    5: [1, 1],
    6: [1, 2],
    7: [2, 0],
    8: [2, 1],
    9: [2, 2],
  };
  return map[num] || null;
}

async function getOrCreateUser(prisma, userId) {
  let user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) {
    const stats = await prisma.stats.create({ data: {} });
    user = await prisma.user.create({
      data: {
        id: userId,
        name: "Unknown",
        stats_id: stats.stats_id,
        config_id: undefined,
      },
    });
  }
  const stats = await prisma.stats.findUnique({
    where: { stats_id: user.stats_id },
  });
  return { user, stats };
}

async function updateTicTacToeStats(prisma, userId, result) {
  const { stats } = await getOrCreateUser(prisma, userId);
  const update = { ttt_games: { increment: 1 } };

  if (result === "win") {
    const newStreak = stats.ttt_streak + 1;
    const newBest = Math.max(stats.ttt_best, newStreak);
    update.ttt_wins = { increment: 1 };
    update.ttt_streak = { increment: 1 };
    update.ttt_best = { set: newBest };
  } else if (result === "loss") {
    update.ttt_losses = { increment: 1 };
    update.ttt_streak = { set: 0 };
  } else if (result === "draw") {
    update.ttt_draws = { increment: 1 };
    update.ttt_streak = { set: 0 };
  }

  const totalGames = stats.ttt_games + 1;
  const totalWins = stats.ttt_wins + (result === "win" ? 1 : 0);
  const winrate = Math.round((totalWins / totalGames) * 100);

  await prisma.stats.update({
    where: { stats_id: stats.stats_id },
    data: {
      ...update,
      ttt_winrate: winrate,
    },
  });
}

const command = {
  name: "velha",
  aliases: ["ttt", "jogo"],
  description: "Jogo da velha entre dois usuários",
  args_length: 1,
  args: "[@user | 1-9 | stats]",
  group_only: true,

  execute: async ({ client, message, args, prisma, prefix }) => {
    const chatId = message.chat.id;
    const senderId = message.sender.id;
    const game = games.get(chatId);

    if (
      args.length === 1 &&
      args[0].toLowerCase() === "recusar" &&
      pendingConfirmations.has(chatId)
    ) {
      const pending = pendingConfirmations.get(chatId);

      if (pending.to !== senderId)
        return client.reply(
          chatId,
          "❌ Você não foi desafiado para este jogo.",
          message.id
        );

      pendingConfirmations.delete(chatId);
      await client.reply(
        chatId,
        "✅ O jogo foi finalizado com sucesso.",
        message.id
      );
    }

    if (
      args.length === 1 &&
      args[0].toLowerCase() === "aceitar" &&
      pendingConfirmations.has(chatId)
    ) {
      const pending = pendingConfirmations.get(chatId);

      if (pending.to !== senderId)
        return client.reply(
          chatId,
          "❌ Você não foi desafiado para este jogo.",
          message.id
        );

      pendingConfirmations.delete(chatId);

      const board = [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ];

      games.set(chatId, {
        board,
        playerX: pending.from,
        playerO: pending.to,
        turn: pending.from,
      });

      const buffer = await renderFlatMinimalTicTacToe({ board });
      return client.sendImage(
        chatId,
        buffer,
        "ttt.png",
        `🎮 Jogo iniciado!
@${pending.from.split("@")[0]} (X) vs @${pending.to.split("@")[0]} (O)
É a vez de @${pending.from.split("@")[0]}!
Use: *${prefix}velha <1-9>*`,
        message.id
      );
    }

    if (args.length === 1 && !game) {
      const opponent = await client.findUser({
        input: args[0],
        chat: chatId,
        message,
      });
      if (!opponent || opponent.id === senderId)
        return client.reply(
          chatId,
          "❌ Desafio inválido. Marque outro usuário.",
          message.id
        );

      pendingConfirmations.set(chatId, { from: senderId, to: opponent.id });

      return client.reply(
        chatId,
        `🎯 @${
          opponent.id.split("@")[0]
        }, você foi desafiado para um jogo da velha por @${
          senderId.split("@")[0]
        }!
Responda com *${prefix}velha aceitar* para começar ou *${prefix}velha recusar* para cancelar o jogo. `,
        message.id
      );
    }

    if (args.length === 1 && game) {
      const position = parseInt(args[0]);
      const pos = numberToPosition(position);

      if (!pos)
        return client.reply(
          chatId,
          "❌ Posição inválida. Use um número de 1 a 9.",
          message.id
        );

      const [row, col] = pos;

      if (game.turn !== senderId)
        return client.reply(
          chatId,
          `⏳ Não é sua vez. É a vez de @${game.turn.split("@")[0]}.`,
          message.id
        );

      if (game.board[row][col])
        return client.reply(
          chatId,
          "⚠️ Essa posição já está ocupada.",
          message.id
        );

      const symbol = senderId === game.playerX ? "X" : "O";
      game.board[row][col] = symbol;

      const winnerCheck = checkWinner(game.board);
      const isFull = game.board.flat().every((c) => c);

      const buffer = await renderFlatMinimalTicTacToe({ board: game.board });

      if (winnerCheck) {
        const loser = symbol === "X" ? game.playerO : game.playerX;
        await updateTicTacToeStats(prisma, senderId, "win");
        await updateTicTacToeStats(prisma, loser, "loss");
        games.delete(chatId);

        return client.sendImage(
          chatId,
          buffer,
          "ttt.png",
          `🏆 Vitória de @${senderId.split("@")[0]}! Fim de jogo.`,
          message.id
        );
      }

      if (isFull) {
        await updateTicTacToeStats(prisma, game.playerX, "draw");
        await updateTicTacToeStats(prisma, game.playerO, "draw");
        games.delete(chatId);

        return client.sendImage(
          chatId,
          buffer,
          "ttt.png",
          `🤝 Empate! Ninguém venceu.`,
          message.id
        );
      }

      game.turn = game.turn === game.playerX ? game.playerO : game.playerX;

      return client.sendImage(
        chatId,
        buffer,
        "ttt.png",
        `🔁 Agora é a vez de @${game.turn.split("@")[0]}!`,
        message.id
      );
    }

    return client.reply(
      chatId,
      `💡 Use:
• *${prefix}velha @usuário* para iniciar
• *${prefix}velha aceitar* para aceitar o desafio
• *${prefix}velha <1-9>* para jogar`,
      message.id
    );
  },
};

export default command;
