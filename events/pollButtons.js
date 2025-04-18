
module.exports = {
  name: 'interactionCreate',
  once: false,
  execute: async (interaction, client) => {
    if (!interaction.isButton()) return;
    
    // Comprobar si es un botón de encuesta
    if (interaction.customId.startsWith('poll_option_')) {
      // El manejo ya está en el comando poll.js
      return;
    }
  }
};
