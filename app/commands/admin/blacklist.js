const command = {
  name: 'blacklist',
  aliases: [],
  description: '',
  args_length: 1,
  args: '<user>',
  admin_only: true,
  group_admin_only: false,
  group_only: false,

  execute: async ({ client, message, args, prefix, prisma }) => {},
};

export default command;
