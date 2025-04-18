require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

console.log(`🚀 Desplegando comandos...`);

const commands = [];
// Recorre todas las categorías de comandos
const categoriesPath = path.join(__dirname, 'commands');
const categories = fs.readdirSync(categoriesPath);

let commandCount = 0;

try {
  for (const category of categories) {
    // Solo toma directorios
    const categoryPath = path.join(categoriesPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    // Lee los archivos de comando en cada categoría
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      try {
        delete require.cache[require.resolve(filePath)]; // Limpiar caché
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          commandCount++;
        } else {
          console.log(`[ADVERTENCIA] El comando en ${filePath} no tiene las propiedades "data" o "execute" requeridas`);
        }
      } catch (error) {
        console.error(`[ERROR] No se pudo cargar el comando en ${filePath}:`, error);
      }
    }
  }

  console.log(`🚀 Desplegando ${commandCount} comandos...`);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  (async () => {
    try {
      const data = await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commands },
      );

      console.log(`✅ Comandos de aplicación (/) recargados con éxito.`);
    } catch (error) {
      console.error('Error al desplegar comandos:', error);
      console.error('Detalles completos:', error); // Added detailed error logging
    }
  })();
} catch (error) {
  console.error('Error durante la carga de comandos:', error);
}