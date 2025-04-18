const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clima')
    .setDescription('🌤️ Obtén el clima actual de una ubicación.')
    .addStringOption((option) =>
      option
        .setName('ubicacion')
        .setDescription('📍 La ubicación para la cual deseas obtener el clima.')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('unidades')
        .setDescription('🌡️ Las unidades para la temperatura (Celsius o Fahrenheit).')
        .setRequired(false)
        .addChoices(
          { name: 'Celsius', value: 'metric' },
          { name: 'Fahrenheit', value: 'imperial' }
        )
    ),
  async execute(interaction) {
    const ubicacion = interaction.options.getString('ubicacion');
    const unidades = interaction.options.getString('unidades') || 'metric'; // Por defecto Celsius
    const apiKey = process.env.WEATHER_API;

    if (!apiKey) {
      return await interaction.reply('❌ La clave de la API de WeatherAPI no está configurada.');
    }

    // Mapear las unidades al formato esperado por la API
    const simboloUnidad = unidades === 'metric' ? '°C' : '°F';
    const respuestaClima = await fetch(
      `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(ubicacion)}`
    );

    if (!respuestaClima.ok) {
      return await interaction.reply(
        '⚠️ No se pudo obtener el clima. Por favor, verifica la ubicación e inténtalo nuevamente.'
      );
    }

    const datos = await respuestaClima.json();

    if (datos.error) {
      return await interaction.reply(
        `❌ No se encontró ninguna ubicación que coincida con "**${ubicacion}**". Por favor, intenta con otra.`
      );
    }

    const embedClima = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🌍 Clima actual en ${datos.location.name}, ${datos.location.region}, ${datos.location.country}`)
      .addFields(
        {
          name: '🌡️ Temperatura',
          value: `${datos.current.temp_c}${simboloUnidad}`,
          inline: true,
        },
        {
          name: '🌥️ Condición',
          value: `${datos.current.condition.text}`,
          inline: true,
        },
        {
          name: '💨 Velocidad del viento',
          value: `${datos.current.wind_kph} kph`,
          inline: true,
        },
        {
          name: '💧 Humedad',
          value: `${datos.current.humidity}%`,
          inline: true,
        },
        {
          name: '🕒 Hora local',
          value: `${datos.location.localtime}`,
          inline: true,
        }
      )
      .setThumbnail(`http:${datos.current.condition.icon}`) // Icono del clima proporcionado por la API
      .setTimestamp()
      .setFooter({ text: '🔗 Datos meteorológicos proporcionados por WeatherAPI' });

    await interaction.reply({ embeds: [embedClima] });
  },
};