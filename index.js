const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActivityType,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const RUOLO_STAFF = '1498741427780190420';
const SERVER_TRANSCRIPT = '1498727991004631290';
const CANALE_TRANSCRIPT = '1521046341407473764';
const EMOJI_MOTIVAZIONE = '<:emoji:1520886268806959245>';
const EMOJI_PING = '<:emoji:1520886407365660845>';

const ticketTranscript = new Map();

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot online come ${c.user.tag}`);

  client.user.setActivity('Ticket', { type: ActivityType.Watching });
});

client.on(Events.InteractionCreate, async (interaction) => {

  // ── /setup-ticket ─────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Solo gli amministratori possono usare questo comando!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎫 Sistema Ticket')
      .setDescription(
        `Benvenuto nel sistema ticket di **${interaction.guild.name}**!\n\n` +
        `Per aprire un ticket seleziona la motivazione dal menu qui sotto.\n` +
        `Un membro dello staff ti risponderà il prima possibile!\n\n` +
        `**📋 Motivazioni disponibili:**\n` +
        `${EMOJI_MOTIVAZIONE} **Richiesta Sviluppatore** — Hai bisogno di uno sviluppatore\n` +
        `${EMOJI_MOTIVAZIONE} **Richiesta Scripter** — Hai bisogno di uno scripter\n` +
        `${EMOJI_MOTIVAZIONE} **Partnership** — Vuoi fare una partnership\n` +
        `${EMOJI_MOTIVAZIONE} **Informazioni** — Hai bisogno di informazioni\n` +
        `${EMOJI_MOTIVAZIONE} **Altro** — Altro tipo di richiesta\n\n` +
        `⚠️ **Non aprire ticket inutili o verrai sanzionato!**`
      )
      .setThumbnail('https://i.imgur.com/RKbUbu2.png')
      .setImage('https://i.imgur.com/2TD7BuY.png')
      .setFooter({ text: interaction.guild.name });

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('Seleziona la motivazione...')
        .addOptions([
          { label: 'Richiesta Sviluppatore', value: 'sviluppatore', emoji: '1520886268806959245' },
          { label: 'Richiesta Scripter', value: 'scripter', emoji: '1520886268806959245' },
          { label: 'Partnership', value: 'partnership', emoji: '1520886268806959245' },
          { label: 'Informazioni', value: 'informazioni', emoji: '1520886268806959245' },
          { label: 'Altro', value: 'altro', emoji: '1520886268806959245' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [menu] });
  }

  // ── Menu selezione ticket ─────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
    const motivazione = interaction.values[0];
    const nomiMotivazione = {
      sviluppatore: 'Richiesta Sviluppatore',
      scripter: 'Richiesta Scripter',
      partnership: 'Partnership',
      informazioni: 'Informazioni',
      altro: 'Altro',
    };

    await interaction.deferReply({ ephemeral: true });

    const ticketEsistente = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.username.toLowerCase()}`
    );
    if (ticketEsistente) {
      return interaction.editReply({ content: `❌ Hai già un ticket aperto: ${ticketEsistente}` });
    }

    const canale = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: RUOLO_STAFF,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    ticketTranscript.set(canale.id, {
      aperto_da: interaction.user.tag,
      motivazione: nomiMotivazione[motivazione],
      messaggi: [],
    });

    const embedTicket = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🎫 Ticket — ${nomiMotivazione[motivazione]}`)
      .setDescription(`Ciao ${interaction.user}! ${EMOJI_PING}\nIl tuo ticket è stato aperto con motivazione **${nomiMotivazione[motivazione]}**.\nUno staff ti risponderà a breve!`)
      .setFooter({ text: interaction.guild.name });

    const bottoni = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim')
        .setEmoji('✋')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_chiudi')
        .setLabel('Chiudi Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger),
    );

    await canale.send({
      content: `${interaction.user} ${EMOJI_PING} <@&${RUOLO_STAFF}>`,
      embeds: [embedTicket],
      components: [bottoni],
    });

    await interaction.editReply({ content: `✅ Ticket aperto! ${canale}` });
  }

  // ── Claim ticket ──────────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'ticket_claim') {
    const member = interaction.member;
    if (!member.roles.cache.has(RUOLO_STAFF)) {
      return interaction.reply({ content: '❌ Solo lo staff può claimare il ticket!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setDescription(`✋ Ticket claimato da **${interaction.user.username}**!`);

    return interaction.reply({ embeds: [embed] });
  }

  // ── Chiudi ticket con bottone ─────────────────────────
  if (interaction.isButton() && interaction.customId === 'ticket_chiudi') {
    const member = interaction.member;
    if (!member.roles.cache.has(RUOLO_STAFF)) {
      return interaction.reply({ content: '❌ Solo lo staff può chiudere il ticket!', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('ticket_modal_chiudi')
      .setTitle('Chiudi Ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('motivazione_chiusura')
            .setLabel('Motivazione della chiusura')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    return interaction.showModal(modal);
  }

  // ── Modal chiusura ────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal_chiudi') {
    const motivazione = interaction.fields.getTextInputValue('motivazione_chiusura');
    await interaction.deferReply({ ephemeral: true });

    const datiTicket = ticketTranscript.get(interaction.channel.id);

    try {
      const messaggi = await interaction.channel.messages.fetch({ limit: 100 });
      const transcript = messaggi.reverse().map(m => `[${m.author.tag}]: ${m.content}`).join('\n');

      const guild = interaction.guild;
      const apritore = guild.members.cache.find(m => m.user.tag === datiTicket?.aperto_da);

      if (apritore) {
        const embedDM = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🔒 Il tuo ticket è stato chiuso')
          .addFields(
            { name: '📋 Motivazione apertura', value: datiTicket?.motivazione || 'N/A' },
            { name: '🔒 Motivazione chiusura', value: motivazione },
            { name: '👮 Chiuso da', value: interaction.user.username },
          )
          .setFooter({ text: guild.name });

        await apritore.send({ embeds: [embedDM] }).catch(() => {});
      }

      const serverTranscript = client.guilds.cache.get(SERVER_TRANSCRIPT);
      if (serverTranscript) {
        const canaleTranscript = serverTranscript.channels.cache.get(CANALE_TRANSCRIPT);
        if (canaleTranscript) {
          const embedTranscript = new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle('📄 Transcript Ticket')
            .addFields(
              { name: '👤 Aperto da', value: datiTicket?.aperto_da || 'N/A' },
              { name: '📋 Motivazione', value: datiTicket?.motivazione || 'N/A' },
              { name: '🔒 Chiuso da', value: interaction.user.username },
              { name: '🔒 Motivazione chiusura', value: motivazione },
            )
            .setFooter({ text: guild.name });

          await canaleTranscript.send({ embeds: [embedTranscript] });

          if (transcript.length > 0) {
            const buf = Buffer.from(transcript, 'utf8');
            await canaleTranscript.send({
              files: [{ attachment: buf, name: `transcript-${interaction.channel.name}.txt` }]
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    await interaction.editReply({ content: '✅ Ticket chiuso!' });
    setTimeout(() => interaction.channel.delete(), 3000);
    ticketTranscript.delete(interaction.channel.id);
  }

  // ── /chiudi-ticket slash ──────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'chiudi-ticket') {
    const member = interaction.member;
    if (!member.roles.cache.has(RUOLO_STAFF)) {
      return interaction.reply({ content: '❌ Solo lo staff può chiudere il ticket!', ephemeral: true });
    }

    const motivazione = interaction.options.getString('motivazione');
    await interaction.deferReply({ ephemeral: true });

    const datiTicket = ticketTranscript.get(interaction.channel.id);

    try {
      const messaggi = await interaction.channel.messages.fetch({ limit: 100 });
      const transcript = messaggi.reverse().map(m => `[${m.author.tag}]: ${m.content}`).join('\n');

      const guild = interaction.guild;
      const apritore = guild.members.cache.find(m => m.user.tag === datiTicket?.aperto_da);

      if (apritore) {
        const embedDM = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🔒 Il tuo ticket è stato chiuso')
          .addFields(
            { name: '📋 Motivazione apertura', value: datiTicket?.motivazione || 'N/A' },
            { name: '🔒 Motivazione chiusura', value: motivazione },
            { name: '👮 Chiuso da', value: interaction.user.username },
          )
          .setFooter({ text: guild.name });

        await apritore.send({ embeds: [embedDM] }).catch(() => {});
      }

      const serverTranscript = client.guilds.cache.get(SERVER_TRANSCRIPT);
      if (serverTranscript) {
        const canaleTranscript = serverTranscript.channels.cache.get(CANALE_TRANSCRIPT);
        if (canaleTranscript) {
          const embedTranscript = new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle('📄 Transcript Ticket')
            .addFields(
              { name: '👤 Aperto da', value: datiTicket?.aperto_da || 'N/A' },
              { name: '📋 Motivazione', value: datiTicket?.motivazione || 'N/A' },
              { name: '🔒 Chiuso da', value: interaction.user.username },
              { name: '🔒 Motivazione chiusura', value: motivazione },
            )
            .setFooter({ text: guild.name });

          await canaleTranscript.send({ embeds: [embedTranscript] });

          if (transcript.length > 0) {
            const buf = Buffer.from(transcript, 'utf8');
            await canaleTranscript.send({
              files: [{ attachment: buf, name: `transcript-${interaction.channel.name}.txt` }]
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    await interaction.editReply({ content: '✅ Ticket chiuso!' });
    setTimeout(() => interaction.channel.delete(), 3000);
    ticketTranscript.delete(interaction.channel.id);
  }
});

client.login(process.env.TOKEN);