
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const AutoRole = require('../../models/AutoRoles'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Configura roles automáticos para nuevos miembros')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('añadir')
        .setDescription('Asigna roles automáticamente a nuevos miembros')
        .addRoleOption((option) =>
          option
            .setName('rol')
            .setDescription('El rol a asignar a nuevos miembros')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('eliminar')
        .setDescription('Elimina un rol del sistema de auto-roles')
        .addRoleOption((option) =>
          option
            .setName('rol')
            .setDescription('El rol a eliminar de las asignaciones automáticas')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ver')
        .setDescription('Muestra todos los roles asignados a nuevos miembros')
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content:
          'No tienes permiso de `Administrador` para gestionar auto-roles.',
        ephemeral: true,
      });
    }
    const { options, guild } = interaction;
    const subcommand = options.getSubcommand();
    const serverId = guild.id;

    // Obtener datos existentes de auto-rol para el servidor
    let autoRole = await AutoRole.findOne({ serverId });

    if (!autoRole) {
      autoRole = new AutoRole({ serverId, roleIds: [] });
      await autoRole.save();
    }

    if (subcommand === 'añadir') {
      const role = options.getRole('rol');
      if (autoRole.roleIds.includes(role.id)) {
        return interaction.reply({
          content: `El rol ${role.name} ya está configurado como auto-rol.`,
          ephemeral: true,
        });
      }
      autoRole.roleIds.push(role.id);
      await autoRole.save();

      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('Auto-Roles Actualizados')
        .setDescription(
          `El rol ${role.name} ha sido añadido a la lista de auto-roles. Los nuevos miembros recibirán automáticamente este rol al unirse.`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'eliminar') {
      const role = options.getRole('rol');
      if (!autoRole.roleIds.includes(role.id)) {
        return interaction.reply({
          content: `El rol ${role.name} no está configurado como auto-rol.`,
          ephemeral: true,
        });
      }
      autoRole.roleIds = autoRole.roleIds.filter((id) => id !== role.id);
      await autoRole.save();

      const embed = new EmbedBuilder()
        .setColor('#FF5733')
        .setTitle('Auto-Rol Eliminado')
        .setDescription(
          `El rol ${role.name} ha sido eliminado de la lista de auto-roles.`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'ver') {
      if (autoRole.roleIds.length === 0) {
        return interaction.reply({
          content: 'No se han configurado auto-roles para este servidor.',
          ephemeral: true,
        });
      }

      const roleNames = autoRole.roleIds
        .map((roleId) => {
          const role = guild.roles.cache.get(roleId);
          return role ? `<@&${roleId}>` : `Rol Desconocido (ID: ${roleId})`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle('Auto-Roles Configurados')
        .setDescription(
          `Los siguientes roles se asignan automáticamente a los nuevos miembros cuando se unen:\n\n${roleNames}`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },
};
