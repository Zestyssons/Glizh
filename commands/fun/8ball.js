const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const responses = [
  'Sí.',
  'No.',
  'Pregunta más tarde.',
  'Definitivamente.',
  'Tal vez.',
  '¡Absolutamente no!',
  '¡Absolutamente!',
  'Yo no contaría con ello.',
  'Es seguro.',
  'Muy dudoso.',
  'Sí, a su debido tiempo.',
  '¡De ninguna manera!',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Pregunta a la Bola Mágica 8.')
    .addStringOption((option) =>
      option
        .setName('pregunta')
        .setDescription('Tu pregunta para la Bola Mágica 8')
        .setRequired(true)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('pregunta');
    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🔮 Bola Mágica 8')
      .setDescription(`Preguntaste: **${question}**`)
      .addFields(
        { name: 'Respuesta', value: response, inline: true },
        {
          name: 'Solicitado por',
          value: `${interaction.user.tag}`,
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};