const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Muestra la latencia del bot y su API."),

  async execute(interaction) {
    const apiPing = Math.round(interaction.client.ws.ping);
    const sent = await interaction.reply({
      content: 'Calculando ping...',
      fetchReply: true,
    });
    const clientPing = sent.createdTimestamp - interaction.createdTimestamp;

    const pingEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🏓 Pong!')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '📡 Ping de API',
          value: `\`${apiPing}ms\``,
          inline: true,
        },
        {
          name: '⏱️ Ping del Cliente',
          value: `\`${clientPing}ms\``,
          inline: true,
        }
      )
      .setDescription('Aquí está la información de latencia del bot:')
      .setFooter({
        text: `Solicitado por ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [pingEmbed] });
  },
};
