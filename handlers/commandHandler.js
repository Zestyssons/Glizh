const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  client.commands = new Map();

  const commandsPath = path.join(__dirname, '../commands');
  let commandCount = 0;
  let categoryCount = 0;

  // Leer todas las categorías dentro de la carpeta "commands"
  const categories = fs.readdirSync(commandsPath).filter((folder) => {
    const categoryPath = path.join(commandsPath, folder);
    return fs.statSync(categoryPath).isDirectory(); // Asegúrate de que sea un directorio
  });

  categoryCount = categories.length;

  // Iterar sobre cada categoría y cargar los comandos
  categories.forEach((category) => {
    const categoryPath = path.join(commandsPath, category);
    const commandFiles = fs
      .readdirSync(categoryPath)
      .filter((file) => file.endsWith('.js'));

    commandFiles.forEach((file) => {
      const commandPath = path.join(categoryPath, file);
      const command = require(commandPath);

      // Validar que el comando tiene una estructura válida
      if (!command.data || !command.data.name) {
        console.error(
          global.styles.errorColor(
            `❌ Error en "${commandPath}": Falta la propiedad "data.name".`
          )
        );
        return;
      }

      client.commands.set(command.data.name, { ...command, category });
      commandCount++;
    });
  });

  // Imprimir el resumen de carga
  console.log(
    global.styles.successColor(
      `✅ Cargados ${commandCount} comandos en ${categoryCount} categorías.`
    )
  );
};