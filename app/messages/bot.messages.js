export default {
  moderation: {
    admin_only: ({ username }) => {
      return `${username} este comando é apenas para administradores do NextBOT.`;
    },
    group_admin: ({ username }) => {
      return `${username} este comando é apenas para administradores do grupo.`;
    },
    group_only: ({ username }) => {
      return `${username} este comando só pode ser usado em grupos.`;
    },
    missing_args: ({ username, command, prefix, args }) => {
      return `${username} você não forneceu os argumentos necessários para o comando. \n Use: ${prefix}${command} <${args}>`;
    },
  },
  exceptions: {
    user_not_found: () => {
      return ``;
    },
  },
  stickers: {
    media_not_found: () => {
      return `Mídia não encontrada. Por favor, envie uma imagem ou vídeo válido.`;
    },
    convert_error: () => {
      return `Erro ao converter a mídia em sticker. Tente novamente com uma imagem ou vídeo diferente.`;
    },
    success: () => {
      return `Sticker criado com sucesso!`;
    },
    invalid_format: () => {
      return `Formato inválido. Por favor, envie uma imagem ou vídeo válido.`;
    },
    error: () => {
      return `⚠️ Ocorreu um erro ao tentar criar a figurinha.\nCertifique-se de que a mídia não é muito grande ou tente novamente mais tarde.`;
    },
  },
};
