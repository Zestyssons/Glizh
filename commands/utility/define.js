const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('define')
    .setDescription('Obtén la definición de una palabra.')
    .addStringOption((option) =>
      option
        .setName('palabra')
        .setDescription('La palabra que deseas definir')
        .setRequired(true)
    ),

  async execute(interaction) {
    const palabra = interaction.options.getString('palabra').toLowerCase();

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${palabra}`
      );

      if (!response.ok) {
        return await interaction.reply(
          `❌ No se pudo encontrar la definición de "${palabra}". Por favor, revisa la ortografía e inténtalo de nuevo.`
        );
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return await interaction.reply(
          `❌ No se encontró ninguna definición para "${palabra}".`
        );
      }

      // Procesar los significados
      const meanings = data[0].meanings.map((meaning) => {
        const definitions = meaning.definitions
          .map((def, index) => `**${index + 1}.** ${def.definition}`)
          .join('\n');

        const examples = meaning.definitions
          .filter((def) => def.example)
          .map((def, index) => `**Ejemplo ${index + 1}:** ${def.example}`)
          .join('\n');

        const synonyms = meaning.definitions
          .flatMap((def) => def.synonyms || [])
          .slice(0, 5) // Limitar a 5 sinónimos
          .join(', ');

        return {
          partOfSpeech: meaning.partOfSpeech,
          definitions,
          examples,
          synonyms,
        };
      });

      // Construir el embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Definiciones de "${palabra}"`)
        .setFooter({ text: 'Fuente: Dictionary API' })
        .setTimestamp();

      // Agregar campos para cada significado
      meanings.forEach((meaning, index) => {
        embed.addFields([
          {
            name: `**${index + 1}. ${meaning.partOfSpeech.toUpperCase()}**`,
            value: meaning.definitions || 'No hay definiciones disponibles.',
          },
        ]);

        if (meaning.examples) {
          embed.addFields([
            {
              name: '📘 Ejemplos:',
              value: meaning.examples,
            },
          ]);
        }

        if (meaning.synonyms) {
          embed.addFields([
            {
              name: '🔗 Sinónimos:',
              value: meaning.synonyms,
            },
          ]);
        }
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al buscar la definición:', error);
      await interaction.reply(
        '❌ Ocurrió un error al buscar la definición. Por favor, inténtalo más tarde.'
      );
    }
  },
};
