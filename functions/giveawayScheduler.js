const { EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

async function checkGiveaways(client) {
  const now = new Date();

  const endedGiveaways = await Giveaway.find({
    ongoing: true,
    endTime: { $lte: now },
  });

  for (const giveaway of endedGiveaways) {
    try {
      const guild = await client.guilds.fetch(giveaway.guildId);
      const channel = await guild.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      if (giveaway.participants.length < giveaway.winners) {
        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.setDescription(
          `Premio: **${giveaway.prize}**\nEstado: **Cancelado - No hay suficientes participantes**`
        );
        embed.setColor('#FF0000');

        await message.edit({ embeds: [embed], components: [] });
        giveaway.ongoing = false;
        await giveaway.save();
        continue;
      }

    const winners = [];
    while (winners.length < giveaway.winners) {
      const winner =
        giveaway.participants[
          Math.floor(Math.random() * giveaway.participants.length)
        ];
      if (!winners.includes(winner)) {
        winners.push(winner);
      }
    }

    giveaway.ongoing = false;
    await giveaway.save();

    const embed = EmbedBuilder.from(message.embeds[0]);
    embed.setTitle('Sorteo Finalizado');
    embed.setDescription(
      `Premio: **${giveaway.prize}**\nGanadores: ${winners.map((w) => `<@${w}>`).join(', ')}`
    );
    embed.setColor('#00FF00');

    await message.edit({ embeds: [embed], components: [] });

    await channel.send(
      `🎉 ¡Felicidades ${winners.map((w) => `<@${w}>`).join(', ')}! ¡Has ganado **${giveaway.prize}**! 🎉`
    );
    } catch (error) {
      console.log(`Error al procesar sorteo ${giveaway._id}: ${error.message}`);
      // Marcar sorteo como finalizado para evitar futuros errores
      giveaway.ongoing = false;
      await giveaway.save();
    }
  }
}

function startGiveawayScheduler(client) {
  setInterval(() => checkGiveaways(client), 10000); // Verificar cada 10 segundos en lugar de cada 10ms
}

module.exports = startGiveawayScheduler;
