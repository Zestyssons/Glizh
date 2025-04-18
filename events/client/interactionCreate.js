const { InteractionType } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Manejar comandos de barra
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No se encontró ningún comando que coincida con ${interaction.commandName}.`);
        return;
      }

      try {
        await command.execute(interaction, interaction.client);
      } catch (error) {
        console.error(`Error al ejecutar el comando ${interaction.commandName}`);
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '¡Hubo un error al ejecutar este comando!',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: '¡Hubo un error al ejecutar este comando!',
            ephemeral: true,
          });
        }
      }
    }

    // Manejar interacciones de autocompletado
    else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No se encontró ningún comando que coincida con ${interaction.commandName}.`);
        return;
      }

      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction, interaction.client);
        }
      } catch (error) {
        console.error(`Error en el autocompletado para ${interaction.commandName}`);
        console.error(error);
      }
    }

    // Manejar interacciones de botones
    else if (interaction.isButton()) {
      // Ejemplo: button_play_12345 (prefijo_acción_valor)
      const [prefix, action, ...values] = interaction.customId.split('_');
      const value = values.join('_'); // Por si el valor contiene guiones bajos

      try {
        // Handlers específicos
        if (interaction.customId.startsWith('giveaway_')) {
          const giveawayHandler = require('../giveawayButton.js');
          await giveawayHandler.execute(interaction);
        }
        else if (interaction.customId.startsWith('poll_')) {
          const pollHandler = require('../pollButtons.js');
          await pollHandler.execute(interaction);
        }
        else if (interaction.customId.startsWith('role_')) {
          const roleHandler = require('../ButtonRole.js');
          await roleHandler.execute(interaction);
        }
        else if (interaction.customId.startsWith('worldwar_')) {
          const worldWarHandler = require('../WorldWar.js');
          await worldWarHandler.execute(interaction);
        }
        else if (interaction.customId.startsWith('guess_')) {
          const guessHandler = require('../GuessGame.js');
          await guessHandler.execute(interaction);
        }
      } catch (error) {
        console.error('Error al manejar la interacción del botón:', error);
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: 'Hubo un error al procesar esta interacción.',
              ephemeral: true
            });
          } else {
            await interaction.reply({
              content: 'Hubo un error al procesar esta interacción.',
              ephemeral: true
            });
          }
        } catch (replyError) {
          console.error('Error al responder con el mensaje de error:', replyError);
        }
      }
    }

    // Manejar interacciones de menús de selección
    else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'search_select') {
        // Esto se maneja en el colector del comando de búsqueda
        return;
      }

      // Otros manejadores de menús de selección se pueden agregar aquí
    }

    // Manejar envíos de modales
    else if (interaction.type === InteractionType.ModalSubmit) {
      try {
        const modalHandler = require('../modalHander.js');
        await modalHandler.execute(interaction);
      } catch (error) {
        console.error('Error al manejar el envío del modal:', error);
        try {
          await interaction.reply({
            content: 'Hubo un error al procesar este formulario.',
            ephemeral: true
          });
        } catch (replyError) {
          console.error('Error al responder con el mensaje de error del modal:', replyError);
        }
      }
    }
  },
};