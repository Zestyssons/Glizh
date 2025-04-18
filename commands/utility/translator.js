const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { translate } = require('@vitalets/google-translate-api');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text to a specified language.')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('The text to translate')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('language')
        .setDescription(
          'The language to translate to (e.g., "es" for Spanish, "fr" for French)'
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('text');
    const targetLanguage = interaction.options.getString('language');

    try {
      const res = await translate(text, { to: targetLanguage });

      const translationEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Traducción`)
        .addFields(
          {
            name: 'Texto Original',
            value: `\`${text}\``,
            inline: false,
          },
          {
            name: 'Texto Traducido',
            value: `\`${res.text}\``,
            inline: false,
          },
          {
            name: 'Idioma',
            value: targetLanguage.toUpperCase(),
            inline: true,
          }
        )
        .setFooter({ text: 'Traducción por Google Translate' })
        .setTimestamp();

      const languageButton = new ButtonBuilder()
        .setLabel('Códigos de Idiomas')
        .setStyle(ButtonStyle.Link)
        .setURL('https://cloud.google.com/translate/docs/languages');

      const row = new ActionRowBuilder().addComponents(languageButton);

      await interaction.reply({
        embeds: [translationEmbed],
        components: [row],
      });
    } catch (error) {
      console.error(error);
      await interaction.reply(
        'Ocurrió un error al intentar traducir el texto. Por favor, inténtalo de nuevo.'
      );
    }
  },
};
