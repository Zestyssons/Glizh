const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Put a member in timeout for a specified duration.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to timeout')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('Duration for the timeout (e.g., 2d1h30m40s)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { default: prettyMs } = await import('pretty-ms');
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getString('duration');
    const reason =
      interaction.options.getString('reason') || 'No reason provided.';
    const member = interaction.guild.members.cache.get(user.id);
    const executor = interaction.member;
    const botMember = interaction.guild.members.cache.get(
      interaction.client.user.id
    );

    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({
        content:
          'You do not have `ModerateMembers` permission to timeout members!',
        ephemeral: true,
      });
    }

    if (member.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content:
          'You cannot timeout this user as they have a higher or equal role.',
        ephemeral: true,
      });
    }
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content:
          'I cannot timeout this user as they have a higher or equal role than me.',
        ephemeral: true,
      });
    }
    if (interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content:
          "This user has the permission of `Administrator`. You can't timeout this user",
      });
    }

    const durationRegex = /^(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?$/;
    if (!durationRegex.test(duration)) {
      return interaction.reply({
        content: 'Invalid duration format! Use something like `1d2h30m40s`.',
        ephemeral: true,
      });
    }

    const durationInMs = parseDuration(duration);
    if (durationInMs < 5000 || durationInMs > 2.419e9) {
      await interaction.reply(
        'Timeout duration cannot be less than 5 seconds or more than 28 days.'
      );
      return;
    }

    try {
      await member.timeout(durationInMs);

      const timeoutEmbed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('Member Timed Out')
        .setDescription(
          `⏳ User \`${user.tag}\` has been put in timeout for ${prettyMs(durationInMs, { verbose: true })}.`
        )
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          {
            name: 'Timeout by',
            value: `<@${interaction.user.id}`,
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [timeoutEmbed] });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content:
          'Failed to timeout the user. Please ensure I have permission to timeout members.',
        ephemeral: true,
      });
    }
  },
};

function parseDuration(duration) {
  const days =
    (duration.match(/(\d+)d/) ? parseInt(duration.match(/(\d+)d/)[1]) : 0) *
    24 *
    60 *
    60 *
    1000;
  const hours =
    (duration.match(/(\d+)h/) ? parseInt(duration.match(/(\d+)h/)[1]) : 0) *
    60 *
    60 *
    1000;
  const minutes =
    (duration.match(/(\d+)m/) ? parseInt(duration.match(/(\d+)m/)[1]) : 0) *
    60 *
    1000;
  const seconds =
    (duration.match(/(\d+)s/) ? parseInt(duration.match(/(\d+)s/)[1]) : 0) *
    1000;

  return days + hours + minutes + seconds;
}
