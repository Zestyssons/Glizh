const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
const Warnings = require('../../models/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advertir')
    .setDescription('Advierte a un usuario por comportamiento inapropiado')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('El usuario a advertir')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Motivo de la advertencia')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');
    const moderator = interaction.user;
    const guild = interaction.guild;

    // Comprobar si el usuario es moderador o tiene un rol superior
    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        content: 'No puedo advertirme a mí mismo.',
        ephemeral: true
      });
    }

    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: 'No puedes advertirte a ti mismo.',
        ephemeral: true
      });
    }

    const targetMember = await guild.members.fetch(user.id).catch(() => null);
    const moderatorMember = await guild.members.fetch(moderator.id).catch(() => null);

    if (targetMember && moderatorMember) {
      if (targetMember.roles.highest.position >= moderatorMember.roles.highest.position) {
        return interaction.reply({
          content: 'No puedes advertir a alguien con un rol igual o superior al tuyo.',
          ephemeral: true
        });
      }
    }

    // Crear la advertencia
    try {
      const warning = await Warnings.create({
        guildId: guild.id,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
        timestamp: new Date()
      });

      // Enviar confirmación
      const warnEmbed = new EmbedBuilder()
        .setTitle('Usuario Advertido')
        .setDescription(`${user.tag} ha sido advertido.`)
        .addFields(
          { name: 'Usuario', value: `<@${user.id}>`, inline: true },
          { name: 'Moderador', value: `<@${moderator.id}>`, inline: true },
          { name: 'Razón', value: reason }
        )
        .setColor('Yellow')
        .setTimestamp();

      await interaction.reply({ embeds: [warnEmbed] });

      // Intentar notificar al usuario
      try {
        const userEmbed = new EmbedBuilder()
          .setTitle(`Has sido advertido en ${guild.name}`)
          .addFields(
            { name: 'Moderador', value: `${moderator.tag}` },
            { name: 'Razón', value: reason }
          )
          .setColor('Yellow')
          .setTimestamp();

        await user.send({ embeds: [userEmbed] });
      } catch (err) {
        console.error(`No se pudo enviar DM al usuario ${user.tag}:`, err);
      }
    } catch (error) {
      console.error('Error al crear la advertencia:', error);
      await interaction.reply({
        content: 'Hubo un error al procesar la advertencia.',
        ephemeral: true
      });
    }
  }
};