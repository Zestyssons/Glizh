const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    try {
      if (message.author.bot) return;

      // Detectar si mencionan al bot
      const mention = new RegExp(`^<@!?${message.client.user.id}>( |)$`);

      if (message.content.match(mention)) {
        try {
          // Crear botones para la invitación y el servidor de soporte
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Invítame')
              .setURL('https://discord.com/oauth2/authorize?client_id=769015435923292180&permissions=8&integration_type=0&scope=bot') // Reemplaza con tu enlace de invitación
              .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
              .setLabel('Servidor de Soporte')
              .setURL('https://discord.gg/G3kgHTWZ4Y') // Reemplaza con tu enlace del servidor de soporte
              .setStyle(ButtonStyle.Link)
          );

          // Crear embed para la respuesta
          const mentionEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Hola, soy Glizh 🤖')
            .setDescription(
              'Usa mis comandos a través de Discord con comandos de barra.\n\n' +
              '📨┆**¡Invítame!**\n' +
              '¿Quieres usar a Glizh en tu servidor? [Haz clic aquí](https://discord.com/oauth2/authorize?client_id=769015435923292180&permissions=8&integration_type=0&scope=bot).\n\n' +
              '❓┇**¿No ves ningún comando?**\n' +
              'Puede que el bot no tenga permisos suficientes. Vuelve a abrir el enlace de invitación y selecciona tu servidor. Así obtendrá los permisos correctos.\n\n' +
              '❓┆**¿Necesitas ayuda?**\n' +
              'Únete a nuestro [servidor de soporte](https://discord.gg/G3kgHTWZ4Y) para resolver tus dudas.\n\n' +
              '🐞┆**¿Encontraste un error?**\n' +
              '¡Informa cualquier bug con el comando: `/report bug`!'
            )
            .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({
              text: '© Glizh Bot 2023-2025',
              iconURL: message.client.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

          // Responder al mensaje con el embed y los botones
          await message.reply({ embeds: [mentionEmbed], components: [row] }).catch(err => {
            console.error('Error al enviar mensaje de mención:', err);
          });
        } catch (mentionError) {
          console.error('Error en el procesamiento de mención:', mentionError);
        }
      }

      // Comprobar si es un comando @play
      if ((message.content.startsWith(`@play`) || message.content.startsWith(`<@${message.client.user.id}> play`)) && !message.author.bot) {
        try {
          // Extraer la consulta de música después de @play o @mention play
          const query = message.content.startsWith(`@play`) 
            ? message.content.slice(5).trim() 
            : message.content.slice(`<@${message.client.user.id}> play`.length).trim();

          if (!query) {
            return message.reply({ content: 'Por favor, proporciona una canción para reproducir.' }).catch(console.error);
          }

          // Buscar el comando play usando el Map
          const playCommand = message.client.commands.get('play');

          if (!playCommand) {
            return message.reply({ content: 'Lo siento, el comando de reproducción no está disponible.' }).catch(console.error);
          }

          // Verificar que la función executeMessage existe
          if (typeof playCommand.executeMessage !== 'function') {
            console.error('El comando play no tiene el método executeMessage');
            return message.reply({ content: 'Lo siento, el comando de reproducción no está configurado correctamente.' }).catch(console.error);
          }

          // Ejecutar el comando play con el mensaje y la consulta
          await playCommand.executeMessage(message.client, message, query);
        } catch (playError) {
          console.error('Error al ejecutar el comando play desde mensaje:', playError);
          message.reply({ content: 'Ocurrió un error al intentar reproducir la música.' }).catch(console.error);
        }
      }
    } catch (globalError) {
      console.error('Error global en messageCreate:', globalError);
    }
  },
};