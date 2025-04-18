const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Warnings = require('../../models/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advertencias')
    .setDescription('Ver advertencias de un usuario')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('El usuario del que quieres ver las advertencias')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const guild = interaction.guild;

    try {
      // Buscar todas las advertencias del usuario en este servidor
      const warnings = await Warnings.find({
        guildId: guild.id,
        userId: user.id
      }).sort({ timestamp: -1 }); // Ordenar por más recientes primero

      if (warnings.length === 0) {
        return interaction.reply({
          content: `${user.tag} no tiene advertencias en este servidor.`,
          ephemeral: true
        });
      }

      // Crear embed con advertencias
      const warningsEmbed = new EmbedBuilder()
        .setTitle(`Advertencias de ${user.tag}`)
        .setColor('Orange')
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: `Total de advertencias: ${warnings.length}` })
        .setTimestamp();

      // Añadir campos para cada advertencia (limitar a las 10 más recientes)
      const recentWarnings = warnings.slice(0, 10);

      for (const [index, warning] of recentWarnings.entries()) {
        const moderator = await interaction.client.users.fetch(warning.moderatorId).catch(() => ({ tag: 'Moderador Desconocido' }));
        const date = new Date(warning.timestamp).toLocaleDateString();

        warningsEmbed.addFields({
          name: `Advertencia #${index + 1} - ${date}`,
          value: `**Razón:** ${warning.reason}\n**Moderador:** ${moderator.tag}`
        });
      }

      if (warnings.length > 10) {
        warningsEmbed.setDescription(`Mostrando las 10 advertencias más recientes de un total de ${warnings.length}`);
      }

      await interaction.reply({ embeds: [warningsEmbed] });
    } catch (error) {
      console.error('Error al obtener advertencias:', error);
      await interaction.reply({
        content: 'Hubo un error al obtener las advertencias.',
        ephemeral: true
      });
    }
  }
};