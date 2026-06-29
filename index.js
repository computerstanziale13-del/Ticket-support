const {
    Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType,
    PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType,
} = require('discord.js');
require('dotenv').config();
const express = require('express');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

// Costanti dalle variabili d'ambiente
const RUOLO_STAFF = process.env.RUOLO_STAFF;
const CANALE_TRANSCRIPT = process.env.CANALE_TRANSCRIPT;

// --- Server di mantenimento (Express) ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(port, () => console.log(`Server web attivo sulla porta ${port}`));

// --- Funzione per chiudere i ticket ---
async function chiudiTicket(interaction, motivazione) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const messaggi = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messaggi.reverse().map(m => `[${m.author.tag}]: ${m.content}`).join('\n');
        const canaleTranscript = interaction.guild.channels.cache.get(CANALE_TRANSCRIPT);
        
        if (canaleTranscript) {
            const embedTranscript = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('📄 Transcript Ticket')
                .addFields(
                    { name: '👤 Canale', value: interaction.channel.name },
                    { name: '🔒 Chiuso da', value: interaction.user.username },
                    { name: '📝 Motivazione', value: motivazione },
                );
            await canaleTranscript.send({ embeds: [embedTranscript] });
            if (transcript.length > 0) {
                const buf = Buffer.from(transcript, 'utf8');
                await canaleTranscript.send({ files: [{ attachment: buf, name: `transcript-${interaction.channel.name}.txt` }] });
            }
        }
    } catch (e) { console.error(e); }

    await interaction.editReply({ content: '✅ Ticket chiuso! Il canale verrà eliminato a breve.' });
    setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
}

// --- Eventi del Bot ---
client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot online come ${c.user.tag}`);
    client.user.setActivity('Ticket', { type: ActivityType.Watching });
});

client.on(Events.InteractionCreate, async (interaction) => {
    // Setup Ticket
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Solo Admin!', ephemeral: true });
        
        const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🎫 Sistema Ticket').setDescription('Seleziona una motivazione per aprire un ticket.');
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('Seleziona...').addOptions([
                { label: 'Sviluppatore', value: 'sviluppatore' },
                { label: 'Altro', value: 'altro' }
            ])
        );
        await interaction.reply({ embeds: [embed], components: [menu] });
    }

    // Menu Selezione
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
        const canale = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: RUOLO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });
        const bottoni = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_chiudi').setLabel('Chiudi').setStyle(ButtonStyle.Danger)
        );
        await canale.send({ content: `Benvenuto ${interaction.user}!`, components: [bottoni] });
        await interaction.reply({ content: `✅ Aperto: ${canale}`, ephemeral: true });
    }

    // Modal Chiusura
    if (interaction.isButton() && interaction.customId === 'ticket_chiudi') {
        const modal = new ModalBuilder().setCustomId('ticket_modal_chiudi').setTitle('Chiudi Ticket').addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo chiusura').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal_chiudi') {
        await chiudiTicket(interaction, interaction.fields.getTextInputValue('motivo'));
    }
});

client.login(process.env.TOKEN);
