const express = require('express');
require('dotenv').config(); // Cargar variables de entorno
const { Client, GatewayIntentBits } = require('discord.js');
const { LavalinkManager } = require('lavalink-client');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { autoPlayFunction } = require('./functions/autoPlay'); // Asegúrate de que esta función exista y sea válida

// ---------------------------------------------------
// Configuración del bot de Discord.js
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Verificar el token
console.log(`Token length: ${process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 'No disponible'}`);

// Iniciar sesión del bot primero
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log(global.styles.successColor('✅ Bot iniciado correctamente'));

    // Iniciar el servidor web y dashboard (ahora solo a través de web/index.js)
    const PORT = process.env.PORT || 3000;
    const dashboardApp = require('./web/index')(client);
    dashboardApp.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor web y dashboard funcionando en http://0.0.0.0:${PORT}`);
    });

    // Mostrar información del bot
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`🤖 Bot Usuario    : ${client.user.tag}`);
    console.log(`🌍 Servidores     : ${client.guilds.cache.size}`);
    console.log(`👥 Usuarios       : ${client.users.cache.size}`);
    console.log(`📡 Estado         : Online 🟢`);
    console.log(`⏰ Iniciado en    : ${new Date().toLocaleString()}`);
    console.log(`📦 Versión        : v1.0.0`);
    console.log(`🔧 Node.js        : ${process.version}`);
    console.log(`💾 Uso de Memoria : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`📂 Categorías:`);
    // Convertir Map a Array para usar map()
    const categories = client.commands ? [...new Set([...client.commands.values()].map(cmd => cmd.category))].filter(Boolean) : [];
    categories.forEach(category => console.log(`    🔸 ${category}`));

    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`\n🚀 ¡El bot está listo! 🚀`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);
  })
  .catch((err) => {
    console.error(global.styles.errorColor(`❌ Error al iniciar sesión: ${err.message}`));
    console.error(global.styles.errorColor(`Stack trace: ${err.stack}`));
  });

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:');
  console.error('- Promesa:', promise);
  console.error('- Razón:', reason);
  // No cerramos el proceso para mantener el bot en línea
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:');
  console.error('- Error:', error);
  console.error('- Stack:', error.stack);
  // No cerramos el proceso para mantener el bot en línea
});

// Configuración de Lavalink para reproducción de música
client.lavalink = new LavalinkManager({
  nodes: [
    {
      authorization: process.env.LL_PASSWORD, // Contraseña de Lavalink
      host: process.env.LL_HOST,             // Host de Lavalink
      port: parseInt(process.env.LL_PORT, 10), // Puerto de Lavalink
      id: process.env.LL_NAME,               // Nombre del nodo
    },
  ],
  sendToShard: (guildId, payload) =>
    client.guilds.cache.get(guildId)?.shard?.send(payload),
  autoSkip: true,
  client: {
    id: process.env.DISCORD_CLIENT_ID,
    username: 'Glizh',
  },
  playerOptions: {
    onEmptyQueue: {
      destroyAfterMs: 30_000, // Destruir después de 30 segundos sin cola
      autoPlayFunction: autoPlayFunction,
    },
  },
});

// Colores para mensajes de consola
const styles = {
  successColor: chalk.bold.green,
  warningColor: chalk.bold.yellow,
  infoColor: chalk.bold.blue,
  commandColor: chalk.bold.cyan,
  userColor: chalk.bold.magenta,
  errorColor: chalk.red,
  highlightColor: chalk.bold.hex('#FFA500'),
  accentColor: chalk.bold.hex('#00FF7F'),
  secondaryColor: chalk.hex('#ADD8E6'),
  primaryColor: chalk.bold.hex('#FF1493'),
  dividerColor: chalk.hex('#FFD700'),
};

global.styles = styles;

// Carga de handlers del bot
const handlerFiles = fs
  .readdirSync(path.join(__dirname, 'handlers')) // Carpeta de handlers
  .filter((file) => file.endsWith('.js')); // Filtrar solo archivos .js
let counter = 0;
for (const file of handlerFiles) {
  counter += 1;
  const handler = require(`./handlers/${file}`);
  if (typeof handler === 'function') {
    handler(client); // Ejecutar handler
  }
}
console.log(
  global.styles.successColor(`✅ ${counter} handlers cargados correctamente`)
);

// Manejo global de errores para promesas rechazadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:');
  console.error('- Promesa:', promise);
  console.error('- Razón:', reason);
  // No cerramos el proceso para mantener el bot en línea
});

// Manejo global de excepciones no capturadas
process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:');
  console.error('- Error:', error);
  console.error('- Stack:', error.stack);
  // No cerramos el proceso para mantener el bot en línea
});

// La inicialización de login ya se movió más arriba