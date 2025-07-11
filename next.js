// @ts-nocheck

/*

 _____                                        ____                         
| ____|   _    __ _ _ __ ___   ___     __ _  | __ ) _ __ _   _ _ __   __ _ 
|  _|| | | |  / _` | '_ ` _ \ / _ \   / _` | |  _ \| '__| | | | '_ \ / _` |
| |__| |_| | | (_| | | | | | | (_) | | (_| | | |_) | |  | |_| | | | | (_| |
|_____\__,_|  \__,_|_| |_| |_|\___/   \__,_| |____/|_|   \__,_|_| |_|\__,_|


*/

import message_handler from "./app/handlers/message.handler.js";
import media_handler from "./app/handlers/media.handler.js";
import botMessages from "./app/messages/bot.messages.js";
import { create } from "@open-wa/wa-automate";
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "url";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

async function config(client) {
  client.commands = new Map();

  client.admins = {
    luiz: { id: "393884018743@c.us" },
    sordinni: { id: "32472916180@c.us" },
    almeida: { id: "559193963676@c.us" },
  };

  client.messages = botMessages;

  client.prefix = ".";

  client.isAdmin = (u) => {
    return Object.values(client.admins).some((admin) => admin.id === u.id);
  };

  client.loadCommands = async () => {
    const commands_folder = path.resolve("app", "commands");
    const commands_categories = fs.readdirSync(commands_folder);

    for (const category of commands_categories) {
      console.log(`[C] Carregando comandos da categoria: ${category}`);
      const commands_path = path.join(commands_folder, category);
      const command_files = fs
        .readdirSync(commands_path)
        .filter((file) => file.endsWith(".js"));

      for (const file of command_files) {
        const commandUrl = pathToFileURL(path.join(commands_path, file)).href;
        const command = await import(commandUrl);

        console.log(`[C] Carregando comando: ${command.default?.name || file}`);
        if (command.default) {
          client.commands.set(command.default.name, command.default);
          if (command.default.aliases) {
            command.default.aliases.forEach((alias) => {
              console.log(`[C] Carregando alias de comando: ${alias || file}`);
              client.commands.set(alias, command.default);
            });
          }
        } else {
          console.warn(`⚠️ Comando ${file} não possui exportação padrão.`);
        }
      }
    }
  };

  client.findUser = ({ input, chat = "", message }) => {
    if (!chat) chat = message.chat.id;
    const participants = message.chat.groupMetadata.participants;

    if (!input && message.quotedMessage?.quoted) {
      const quotedUserId =
        message.quotedMessage.quoted.sender?.id ||
        message.quotedMessage.quoted?.id?.participant;
      const quotedUser = participants.find((p) => p.id === quotedUserId);
      return quotedUser || null;
    }

    if (!input) return null;

    const tryAllModes = () => {
      const tryModes = [
        () =>
          participants.find((c) => c.id.replace("@c.us", "").includes(input)),
        () => participants.find((c) => c.id === input),
        () =>
          participants.find(
            (c) => c.id.replace("@c.us", "") === input.replace("@", "")
          ),
        () =>
          participants.find((c) =>
            (c.pushname || "").toLowerCase().includes(input.toLowerCase())
          ),
      ];

      for (const tryMode of tryModes) {
        const result = tryMode();
        if (result) return result;
      }

      return null;
    };

    let mode;
    if (!isNaN(parseInt(input))) mode = "number";
    else if (input.includes("@c.us")) mode = "id";
    else if (input.includes("@")) mode = "tag";
    else mode = "name";

    let users = [];

    switch (mode) {
      case "number":
        users = participants.filter((c) =>
          c.id.replace("@c.us", "").includes(input)
        );
        break;

      case "id":
        users = participants.filter((c) => c.id === input);
        break;

      case "tag":
        users = participants.filter(
          (c) => c.id.replace("@c.us", "") === input.replace("@", "")
        );
        break;

      case "name":
        users = participants.filter((c) =>
          (c.pushname || "").toLowerCase().includes(input.toLowerCase())
        );
        break;
    }

    return users[0] || tryAllModes();
  };
}

prisma
  .$connect()
  .then(() => {
    console.log("✅ Conectado ao Prisma com sucesso!");
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar ao Prisma:", err);
  });

create({
  sessionId: "next",
  useChrome: true,
}).then(async (client) => {
  console.clear();

  client.id = (await client.getMe()).id;
  await config(client);

  client.loadCommands().then(() => {
    console.log("✅ Comandos carregados com sucesso!");
  });

  client.onMessage(async (m) => {
    try {
      const isMedia =
        m.mimetype?.includes("image/") || m.mimetype?.includes("video/");

      if (isMedia) {
        return await media_handler({
          client,
          message: m,
          prisma,
        });
      }

      return await message_handler({
        client,
        message: m,
        prisma,

        prefix: client.prefix || ".",
      });
    } catch (err) {
      console.error("❌ Erro ao processar mensagem:", err);
    }
  });
});

process.on("SIGINT", async () => {
  console.log("🔌 Encerrando conexão com o banco...");
  await prisma.$disconnect();
  process.exit();
});
