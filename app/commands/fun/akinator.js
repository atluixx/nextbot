const { Akinator, AkinatorAnswer } = require('@aqul/akinator-api');

const normalizeInput = (text) => {
  if (!text) return undefined;
  const t = text.trim().toLowerCase();
  if (t === 'sim' || t === 's' || t === 'yes') return AkinatorAnswer.Yes;
  if (t === 'não' || t === 'nao' || t === 'n' || t === 'no')
    return AkinatorAnswer.No;
  if (t === 'não sei' || t === 'naosei' || t === 'idk' || t === "don't know")
    return AkinatorAnswer["Don't know"];
  if (t === 'provavelmente' || t === 'probably') return AkinatorAnswer.Probably;
  if (
    t === 'provavelmente não' ||
    t === 'provavelmente nao' ||
    t === 'probably not'
  )
    return AkinatorAnswer['Probably not'];
  if (t === 'voltar' || t === 'back') return 'back';
  if (t === 'sair' || t === 'quit' || t === 'parar' || t === 'exit')
    return 'quit';
  return undefined;
};

if (!global.akinatorSessions) global.akinatorSessions = {};

module.exports = {
  name: 'akinator',
  description:
    "Jogue com o Akinator via WhatsApp. Use 'akinator' para iniciar e 'akinator sim|não|...' para responder.",
  args_length: 1,
  args: '[resposta]',
  admin_only: false,
  group_admin_only: false,
  group_only: false,

  execute: async (context) => {
    const client = context.client;
    const message = context.message;
    const args = context.args || [];
    const prefix = context.prefix || '';
    const chatId = message.from;

    const replyText = async (txt) => {
      await client.sendText(chatId, txt);
    };

    const userArg = args[0]?.trim();

    let session = global.akinatorSessions[chatId];
    const wantsStart =
      !session ||
      (userArg &&
        ['reset', 'start', 'novo', 'reiniciar'].includes(
          userArg.toLowerCase()
        ));

    if (wantsStart) {
      const api = new Akinator({ region: 'pt', childMode: false });
      await api.start();
      global.akinatorSessions[chatId] = {
        api,
        history: [],
      };
      await replyText(
        `🧠 Iniciando Akinator!\nPergunta: ${
          api.question
        }\nProgresso: ${api.progress.toFixed(2)}%\n\nResponda com:\n` +
          `\`${prefix}akinator sim\` / \`${prefix}akinator não\` / \`${prefix}akinator não sei\` / \`${prefix}akinator provavelmente\` / \`${prefix}akinator provavelmente não\`\n` +
          `Use \`${prefix}akinator voltar\` para desfazer, \`${prefix}akinator sair\` para encerrar.`
      );
      return;
    }

    if (!session) {
      await replyText(
        `Nenhuma sessão ativa. Envie \`${prefix}akinator\` para começar.`
      );
      return;
    }

    const api = session.api;
    const history = session.history;

    if (api.isWin) {
      await replyText(
        `🟢 O jogo já terminou. Envie \`${prefix}akinator\` para reiniciar.`
      );
      return;
    }

    if (!userArg) {
      await replyText(
        `Você precisa responder com \`${prefix}akinator sim\`, \`${prefix}akinator não\`, etc. Pergunta atual:\n` +
          `❓ ${api.question}\nProgresso: ${api.progress.toFixed(2)}%`
      );
      return;
    }

    const normalized = normalizeInput(userArg);
    if (normalized === undefined) {
      await replyText(
        `Resposta não reconhecida. Use: \`${prefix}akinator sim\` / \`${prefix}akinator não\` / \`${prefix}akinator não sei\` / \`${prefix}akinator provavelmente\` / \`${prefix}akinator voltar\` / \`${prefix}akinator sair\`.`
      );
      return;
    }

    if (normalized === 'quit') {
      delete global.akinatorSessions[chatId];
      await replyText(
        '❌ Jogo encerrado. Envie `' + prefix + 'akinator` para começar outro.'
      );
      return;
    }

    if (normalized === 'back') {
      try {
        await api.cancelAnswer();
        history.pop();
        await replyText(
          `⏪ Voltou.\nPergunta: ${
            api.question
          }\nProgresso: ${api.progress.toFixed(2)}%`
        );
      } catch (err) {
        await replyText(
          '⚠️ Não foi possível voltar. Já está na primeira pergunta.'
        );
      }
      return;
    }

    await api.answer(normalized);
    const enumKey = Object.keys(AkinatorAnswer).find(
      (k) => AkinatorAnswer[k] === normalized
    );
    if (enumKey) history.push(enumKey);

    if (api.isWin) {
      const caption = `🎯 Eu acho que é: *${api.sugestion_name}*\n${api.sugestion_desc}`;
      if (api.sugestion_photo) {
        try {
          await client.sendFileFromUrl(
            chatId,
            api.sugestion_photo,
            'guess.jpg',
            caption
          );
        } catch (err) {
          await replyText(`${caption}\nFoto: ${api.sugestion_photo}`);
        }
      } else {
        await replyText(`${caption}\n(sem imagem disponível)`);
      }
      return;
    }

    await replyText(
      `❓ Pergunta: ${api.question}\nProgresso: ${api.progress.toFixed(2)}%\n` +
        `Responda com: \`${prefix}akinator sim\` / \`${prefix}akinator não\` / \`${prefix}akinator não sei\` / \`${prefix}akinator provavelmente\` / \`${prefix}akinator provavelmente não\`.\n` +
        `Use \`${prefix}akinator voltar\` ou \`${prefix}akinator sair\`.`
    );
  },
};
