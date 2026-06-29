const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Invia il pannello ticket nel canale corrente'),

  new SlashCommandBuilder()
    .setName('chiudi-ticket')
    .setDescription('Chiudi il ticket corrente')
    .addStringOption(o => o.setName('motivazione').setDescription('Motivazione della chiusura').setRequired(true)),

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('⏳ Registrazione comandi...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Comandi registrati!');
  } catch (error) {
    console.error(error);
  }
})();