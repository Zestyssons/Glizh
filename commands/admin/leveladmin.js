
const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');
const { GuildSettings, LevelRoles, MemberData } = require('../../models/Level');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('niveles')
    .setDescription('Administra el sistema de niveles')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('añadirrolnivel')
        .setDescription('Añade un rol para ser otorgado en un nivel específico')
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Nivel para asignar el rol')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName('rol')
            .setDescription('Rol a asignar')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('quitarrolnivel')
        .setDescription('Elimina un rol asignado a un nivel específico')
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Nivel del que quitar el rol')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('añadirnivel')
        .setDescription('Añade un nivel a un usuario')
        .addUserOption((option) =>
          option
            .setName('usuario')
            .setDescription('Usuario al que añadir un nivel')
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Nivel a añadir')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('establecernivel')
        .setDescription('Establece el nivel de un usuario')
        .addUserOption((option) =>
          option
            .setName('usuario')
            .setDescription('Usuario al que establecer el nivel')
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Nivel a establecer')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('quitarnivel')
        .setDescription('Quita un nivel a un usuario')
        .addUserOption((option) =>
          option
            .setName('usuario')
            .setDescription('Usuario al que quitar un nivel')
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Nivel a quitar')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('canalniveles')
        .setDescription('Establece el canal para anuncios de subida de nivel')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal para enviar anuncios')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('tasaxp')
        .setDescription('Establece la tasa de crecimiento de XP')
        .addNumberOption((option) =>
          option
            .setName('tasa')
            .setDescription('Multiplicador de la tasa de XP')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('activar')
        .setDescription('Activa o desactiva el sistema de niveles')
        .addStringOption((option) =>
          option
            .setName('estado')
            .setDescription('Activar o desactivar el sistema de niveles')
            .addChoices(
              { name: 'activar', value: 'on' },
              { name: 'desactivar', value: 'off' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('listarolesnivel')
        .setDescription('Lista todos los roles de nivel para este servidor')
    ),
  async execute(interaction) {
    let guildData = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });
    
    if (!guildData) {
      guildData = new GuildSettings({
        guildId: interaction.guild.id,
        levelingEnabled: false,
        xpRate: 1,
      });
      await guildData.save();
    }
    
    const subcommand = interaction.options.getSubcommand();
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: 'No tienes permiso de `Administrador` para gestionar niveles.',
        ephemeral: true,
      });
    }

    switch (subcommand) {
      case 'añadirrolnivel': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }

        const level = interaction.options.getInteger('nivel');
        const role = interaction.options.getRole('rol');

        // Verificar si ya existe un rol para este nivel
        const existingRole = await LevelRoles.findOne({
          guildId: interaction.guild.id,
          level: level,
        });

        if (existingRole) {
          await LevelRoles.findOneAndUpdate(
            { guildId: interaction.guild.id, level: level },
            { roleId: role.id }
          );
          
          const embed = new EmbedBuilder()
            .setTitle('Rol de Nivel Actualizado')
            .setDescription(
              `El rol para el nivel **${level}** ha sido actualizado a **${role.name}**.`
            )
            .setColor('Yellow');
            
          await interaction.reply({ embeds: [embed] });
        } else {
          await LevelRoles.create({
            guildId: interaction.guild.id,
            level: level,
            roleId: role.id,
          });

          const embed = new EmbedBuilder()
            .setTitle('Rol de Nivel Añadido')
            .setDescription(
              `El rol **${role.name}** será otorgado al alcanzar el nivel **${level}**.`
            )
            .setColor('Green');

          await interaction.reply({ embeds: [embed] });
        }
        break;
      }
      case 'quitarrolnivel': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }
        const level = interaction.options.getInteger('nivel');
        
        const existingRole = await LevelRoles.findOne({
          guildId: interaction.guild.id,
          level: level,
        });
        
        if (!existingRole) {
          return interaction.reply({
            content: `No hay ningún rol configurado para el nivel **${level}**.`,
            ephemeral: true,
          });
        }
        
        await LevelRoles.deleteOne({
          guildId: interaction.guild.id,
          level: level,
        });

        const embed = new EmbedBuilder()
          .setTitle('Rol de Nivel Eliminado')
          .setDescription(`Se ha eliminado el rol para el nivel **${level}**.`)
          .setColor('Red');

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'añadirnivel': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }
        const user = interaction.options.getUser('usuario');
        const levelToAdd = interaction.options.getInteger('nivel');
        
        if (levelToAdd <= 0) {
          return interaction.reply({
            content: 'El nivel a añadir debe ser mayor que 0.',
            ephemeral: true,
          });
        }
        
        let memberData = await MemberData.findOne({
          guildId: interaction.guild.id,
          userId: user.id,
        });

        if (!memberData) {
          memberData = new MemberData({
            guildId: interaction.guild.id,
            userId: user.id,
            level: 1,
            xp: 0,
          });
        }
        memberData.level += levelToAdd;
        await memberData.save();

        const embed = new EmbedBuilder()
          .setTitle('Nivel Añadido')
          .setDescription(
            `A ${user} se le han añadido **${levelToAdd}** nivel(es). Ahora es nivel **${memberData.level}**.`
          )
          .setColor('Blue');

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'establecernivel': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }
        const user = interaction.options.getUser('usuario');
        const newLevel = interaction.options.getInteger('nivel');
        
        if (newLevel <= 0) {
          return interaction.reply({
            content: 'El nivel debe ser mayor que 0.',
            ephemeral: true,
          });
        }
        
        let memberData = await MemberData.findOne({
          guildId: interaction.guild.id,
          userId: user.id,
        });

        if (!memberData) {
          memberData = new MemberData({
            guildId: interaction.guild.id,
            userId: user.id,
            level: newLevel,
            xp: 0,
          });
        } else {
          memberData.level = newLevel;
        }
        await memberData.save();

        const embed = new EmbedBuilder()
          .setTitle('Nivel Establecido')
          .setDescription(
            `El nivel de ${user} ha sido establecido a **${newLevel}**.`
          )
          .setColor('Yellow');

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'quitarnivel': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }
        const user = interaction.options.getUser('usuario');
        const levelToRemove = interaction.options.getInteger('nivel');
        
        if (levelToRemove <= 0) {
          return interaction.reply({
            content: 'El nivel a quitar debe ser mayor que 0.',
            ephemeral: true,
          });
        }
        
        let memberData = await MemberData.findOne({
          guildId: interaction.guild.id,
          userId: user.id,
        });

        if (!memberData || memberData.level <= 1) {
          return interaction.reply({
            content: `${user.username} no tiene suficientes niveles para quitar.`,
            ephemeral: true,
          });
        }
        memberData.level = Math.max(1, memberData.level - levelToRemove);
        await memberData.save();

        const embed = new EmbedBuilder()
          .setTitle('Nivel Quitado')
          .setDescription(
            `Se han quitado **${levelToRemove}** nivel(es) a ${user}. Ahora es nivel **${memberData.level}**.`
          )
          .setColor('Orange');

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'canalniveles': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }
        const channel = interaction.options.getChannel('canal');
        await GuildSettings.findOneAndUpdate(
          { guildId: interaction.guild.id },
          { levelUpChannelId: channel.id },
          { upsert: true }
        );

        const embed = new EmbedBuilder()
          .setTitle('Canal de Niveles Establecido')
          .setDescription(`Los anuncios de subida de nivel se enviarán a ${channel}.`)
          .setColor('Purple');

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'tasaxp': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }
        const rate = interaction.options.getNumber('tasa');
        
        if (rate <= 0) {
          return interaction.reply({
            content: 'La tasa de XP debe ser mayor que 0.',
            ephemeral: true,
          });
        }
        
        await GuildSettings.findOneAndUpdate(
          { guildId: interaction.guild.id },
          { xpRate: rate },
          { upsert: true }
        );

        const embed = new EmbedBuilder()
          .setTitle('Tasa de XP Establecida')
          .setDescription(`La tasa de XP ha sido establecida a **${rate}x**.`)
          .setColor('Aqua');

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'activar': {
        const state = interaction.options.getString('estado');
        const isEnabled = state === 'on';
        await GuildSettings.findOneAndUpdate(
          { guildId: interaction.guild.id },
          { levelingEnabled: isEnabled },
          { upsert: true }
        );

        const embed = new EmbedBuilder()
          .setTitle('Sistema de Niveles')
          .setDescription(`El sistema de niveles ha sido **${isEnabled ? 'activado' : 'desactivado'}**.`)
          .setColor(isEnabled ? 'Green' : 'Red');

        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'listarolesnivel': {
        if (!guildData.levelingEnabled) {
          return interaction.reply({
            content: 'El sistema de niveles no está activado en este servidor.',
            ephemeral: true,
          });
        }
        
        const levelRoles = await LevelRoles.find({
          guildId: interaction.guild.id,
        }).sort({ level: 1 });

        if (levelRoles.length === 0) {
          return interaction.reply({
            content: 'No hay roles de nivel configurados para este servidor.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('Roles de Nivel')
          .setDescription('Estos roles se otorgan automáticamente al alcanzar ciertos niveles:')
          .setColor('Blue');

        levelRoles.forEach(role => {
          embed.addFields({
            name: `Nivel ${role.level}`,
            value: `<@&${role.roleId}>`,
            inline: true
          });
        });

        await interaction.reply({ embeds: [embed], ephemeral: false });
        break;
      }
    }
  },
};
