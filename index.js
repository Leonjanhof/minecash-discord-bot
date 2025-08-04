const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration with separate categories
const config = {
  guildId: process.env.DISCORD_GUILD_ID,
  adminRoleId: process.env.ADMIN_ROLE_ID,
  supportCategoryId: process.env.SUPPORT_CATEGORY_ID,
  depositWithdrawCategoryId: process.env.DEPOSIT_WITHDRAW_CATEGORY_ID,
  botToken: process.env.DISCORD_BOT_TOKEN
};

// Bot ready event
client.once('ready', () => {
  console.log(`Minecash Discord Bot is online as ${client.user.tag}`);
  console.log(`Monitoring guild: ${config.guildId}`);
});

// Check if user has existing open ticket of the same type
async function hasExistingOpenTicket(discordUserId, ticketType) {
  try {
    // Get internal user ID from Discord ID
    const internalUserId = await getUserIdByDiscordId(discordUserId);
    if (!internalUserId) {
      console.log(`User with Discord ID ${discordUserId} not found in database`);
      return false;
    }

    // Check for existing open tickets of the same type
    const { data: existingTickets, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_type, status, created_at')
      .eq('user_id', internalUserId)
      .eq('ticket_type', ticketType)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking existing tickets:', error);
      return false;
    }

    if (existingTickets && existingTickets.length > 0) {
      console.log(`User ${discordUserId} already has an open ${ticketType} ticket`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking existing tickets:', error);
    return false;
  }
}

// Get user's existing open tickets
async function getUserOpenTickets(discordUserId) {
  try {
    // Get internal user ID from Discord ID
    const internalUserId = await getUserIdByDiscordId(discordUserId);
    if (!internalUserId) {
      console.log(`User with Discord ID ${discordUserId} not found in database`);
      return [];
    }

    // Get all open tickets for the user
    const { data: openTickets, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_type, status, amount, created_at, discord_channel_id')
      .eq('user_id', internalUserId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching open tickets:', error);
      return [];
    }

    return openTickets || [];
  } catch (error) {
    console.error('Error getting user open tickets:', error);
    return [];
  }
}

// Get GC limits from database
async function getGCLimits() {
  try {
    const { data, error } = await supabase
      .from('gc_limits')
      .select('*');

    if (error) {
      console.error('Error fetching GC limits:', error);
      return {
        deposit: { min: 50, max: 500 },
        withdraw: { min: 50, max: 500 }
      };
    }

    const limits = {
      deposit: { min: 50, max: 500 },
      withdraw: { min: 50, max: 500 }
    };

    data?.forEach(limit => {
      limits[limit.limit_type] = {
        min: limit.min_amount,
        max: limit.max_amount
      };
    });

    return limits;
  } catch (error) {
    console.error('Error getting GC limits:', error);
    return {
      deposit: { min: 50, max: 500 },
      withdraw: { min: 50, max: 500 }
    };
  }
}

// Handle ticket creation
async function createTicket(userId, type, amount = null, description = '') {
  try {
    // Only validate amount for deposit/withdraw tickets, not support tickets
    if (type === 'deposit' || type === 'withdraw') {
      // Get current GC limits
      const limits = await getGCLimits();
      const typeLimits = limits[type] || { min: 50, max: 500 };
      
      // Validate amount if provided
      if (amount !== null && (amount < typeLimits.min || amount > typeLimits.max)) {
        console.log(`Invalid amount: ${amount} (must be ${typeLimits.min}-${typeLimits.max})`);
        return { success: false, error: `Amount must be between ${typeLimits.min} and ${typeLimits.max} GC` };
      }
    }

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
      console.error('Guild not found');
      return { success: false, error: 'Guild not found' };
    }

    // Check if user is in the server
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      console.log(`User ${userId} is not in the server`);
      return { success: false, error: 'User not in server' };
    }

    // Check if user already has an open ticket of the same type
    const hasExistingTicket = await hasExistingOpenTicket(userId, type);
    if (hasExistingTicket) {
      return { 
        success: false, 
        error: `You already have an open ${type} ticket. Please wait for it to be resolved before creating a new one.` 
      };
    }

    // Determine category based on ticket type
    let categoryId;
    let channelName;
    
    if (type === 'support') {
      categoryId = config.supportCategoryId;
      channelName = `support-${Math.random().toString(36).substring(2, 8)}`;
    } else {
      // deposit or withdraw
      categoryId = config.depositWithdrawCategoryId;
      channelName = `${type}-${Math.random().toString(36).substring(2, 8)}`;
    }
    
    // Create channel
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: userId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        }
      ]
    });

    // Add admin role to channel
    if (config.adminRoleId) {
      await channel.permissionOverwrites.create(config.adminRoleId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true
      });
    }

    // Create embed with updated format
    const embed = new EmbedBuilder()
      .setColor(type === 'withdraw' ? '#FF6B6B' : type === 'deposit' ? '#4ECDC4' : '#45B7D1')
      .setTitle(`Minecash ${type} request`)
      .setDescription(`A new ${type} request has been created`)
      .addFields(
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Created', value: new Date().toLocaleString(), inline: true }
      );

    if (amount) {
      embed.addFields({ name: 'Amount', value: `${amount} GC`, inline: true });
    }

    if (description) {
      embed.addFields({ name: 'Description', value: description, inline: false });
    }

    embed.setFooter({ text: 'Minecash support system' })
      .setTimestamp();

    // Create buttons based on ticket type
    const buttons = [];
    
    // Close button for all ticket types
    const closeButton = new ButtonBuilder()
      .setCustomId(`close_ticket_${channel.id}`)
      .setLabel('Close ticket')
      .setStyle(ButtonStyle.Danger);

    buttons.push(closeButton);

    // Confirm button for deposit/withdraw tickets
    if (type === 'deposit' || type === 'withdraw') {
      const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_${type}_${channel.id}_${amount}`)
        .setLabel(type === 'deposit' ? 'Confirm deposit' : 'Confirm withdrawal')
        .setStyle(ButtonStyle.Success);
      
      buttons.push(confirmButton);
    }

    const row = new ActionRowBuilder().addComponents(buttons);

    // Send initial message with buttons
    await channel.send({ embeds: [embed], components: [row] });

    // Log to database
    await logTicketToDatabase(userId, type, amount, channel.id, description);

    console.log(`Created ${type} ticket: ${channelName} for user ${userId}`);
    return { success: true, channelId: channel.id, channelName };

  } catch (error) {
    console.error(`Error creating ticket:`, error);
    return { success: false, error: error.message };
  }
}

// Get internal user ID from Discord ID
async function getUserIdByDiscordId(discordId) {
  try {
    // Check if user exists and get their internal ID
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('discord_id', discordId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
      return null;
    }

    if (existingUser) {
      return existingUser.id;
    }

    // User doesn't exist in our system yet
    console.log(`User with Discord ID ${discordId} not found in database`);
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Log ticket to database
async function logTicketToDatabase(discordUserId, type, amount, channelId, description) {
  try {
    // Get internal user ID from Discord ID
    const internalUserId = await getUserIdByDiscordId(discordUserId);
    if (!internalUserId) {
      console.error(`User with Discord ID ${discordUserId} not found in database. Cannot create ticket.`);
      return;
    }

    const { error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: internalUserId,
        ticket_type: type,
        amount: amount,
        discord_channel_id: channelId,
        description: description,
        status: 'pending'
      });

    if (error) {
      console.error('Database error:', error);
    } else {
      console.log(`✅ Logged ticket to database: ${type} for Discord user ${discordUserId} (internal ID: ${internalUserId})`);
    }
  } catch (error) {
    console.error('Database logging error:', error);
  }
}

// Check if user is in server
async function isUserInServer(userId) {
  try {
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return false;

    const member = await guild.members.fetch(userId).catch(() => null);
    return member !== null;
  } catch (error) {
    console.error('Error checking user membership:', error);
    return false;
  }
}

// Check if user has admin permissions (Discord roles)
function hasAdminPermissions(member) {
  if (!member || !config.adminRoleId) return false;
  
  // Check if user has the admin role
  const hasAdminRole = member.roles.cache.has(config.adminRoleId);
  
  // Also check if user has administrator permission
  const hasAdminPermission = member.permissions.has(PermissionFlagsBits.Administrator);
  
  return hasAdminRole || hasAdminPermission;
}

// Check if user has admin role in database
async function hasAdminRoleInDatabase(discordUserId) {
  try {
    // Get user from database using Discord ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        role_id,
        user_roles!inner (
          id,
          name
        )
      `)
      .eq('discord_id', discordUserId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user from database:', userError);
      return false;
    }

    // Check if user has admin role (role_id = 3)
    const hasAdminRole = user.role_id === 3;
    
    console.log(`User ${discordUserId} has role_id: ${user.role_id}, admin: ${hasAdminRole}`);
    
    return hasAdminRole;
  } catch (error) {
    console.error('Error checking admin role in database:', error);
    return false;
  }
}

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // Handle button interactions
  if (interaction.isButton()) {
    const customId = interaction.customId;
    
    if (customId.startsWith('close_ticket_')) {
      await handleCloseTicket(interaction);
    } else if (customId.startsWith('confirm_deposit_') || customId.startsWith('confirm_withdraw_')) {
      await handleConfirmTransaction(interaction);
    }
    return;
  }

  // Handle slash commands
  const { commandName } = interaction;

  if (commandName === 'checkuser') {
    const userId = interaction.options.getString('userid');
    const inServer = await isUserInServer(userId);
    
         const embed = new EmbedBuilder()
       .setColor(inServer ? '#4ECDC4' : '#FF6B6B')
       .setTitle('User server status')
       .addFields(
         { name: 'User ID', value: userId, inline: true },
         { name: 'In server', value: inServer ? 'Yes' : 'No', inline: true }
       )
       .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// Handle closing tickets
async function handleCloseTicket(interaction) {
  try {
    // Check if user has admin permissions (Discord roles)
    const member = interaction.member;
    const hasDiscordAdmin = hasAdminPermissions(member);
    
    // Check if user has admin role in database
    const hasDatabaseAdmin = await hasAdminRoleInDatabase(interaction.user.id);
    
    // User must have BOTH Discord admin role AND database admin role
    if (!hasDiscordAdmin || !hasDatabaseAdmin) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('Permission denied')
        .setDescription('You do not have permission to close tickets. Only staff members with admin role can close tickets.')
        .setTimestamp();
      
      await interaction.reply({ 
        embeds: [embed], 
        ephemeral: true 
      });
      return;
    }

    const channelId = interaction.customId.split('_')[2];
    const channel = interaction.guild.channels.cache.get(channelId);
    
    if (!channel) {
      await interaction.reply({ content: 'Channel not found', ephemeral: true });
      return;
    }

    // Update ticket status in database
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('discord_channel_id', channelId);

    if (error) {
      console.error('Database error updating ticket status:', error);
    }

    // Send closing message
    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('Ticket closed')
      .setDescription('This ticket has been closed by staff.')
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Delete channel after 10 seconds
    setTimeout(async () => {
      try {
        await channel.delete();
        console.log(`Deleted channel: ${channel.name}`);
      } catch (error) {
        console.error('Error deleting channel:', error);
      }
    }, 10000);

    await interaction.reply({ content: 'Ticket closed successfully', ephemeral: true });

  } catch (error) {
    console.error('Error closing ticket:', error);
    await interaction.reply({ content: 'Error closing ticket', ephemeral: true });
  }
}

// Handle confirming deposits/withdrawals
async function handleConfirmTransaction(interaction) {
  try {
    // Check if user has admin permissions (Discord roles)
    const member = interaction.member;
    const hasDiscordAdmin = hasAdminPermissions(member);
    
    // Check if user has admin role in database
    const hasDatabaseAdmin = await hasAdminRoleInDatabase(interaction.user.id);
    
    // User must have BOTH Discord admin role AND database admin role
    if (!hasDiscordAdmin || !hasDatabaseAdmin) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('Permission denied')
        .setDescription('You do not have permission to confirm transactions. Only staff members with admin role can process deposits and withdrawals.')
        .setTimestamp();
      
      await interaction.reply({ 
        embeds: [embed], 
        ephemeral: true 
      });
      return;
    }

    const parts = interaction.customId.split('_');
    const type = parts[1]; // deposit or withdraw
    const channelId = parts[2];
    const amount = parseInt(parts[3]);
    const userId = interaction.message.embeds[0].fields.find(f => f.name === 'User')?.value.replace(/[<@!>]/g, '');

    if (!userId || !amount) {
      await interaction.reply({ content: 'Invalid transaction data', ephemeral: true });
      return;
    }

         // Get user from users table using Discord ID
     const { data: user, error: userError } = await supabase
       .from('users')
       .select('id')
       .eq('discord_id', userId)
       .single();

     if (userError || !user) {
       console.error('Error fetching user:', userError);
       const embed = new EmbedBuilder()
         .setColor('#FF6B6B')
         .setTitle('User not found')
         .setDescription('User not found in database. Please ensure you have linked your Discord account.')
         .setTimestamp();
       
       await interaction.reply({ embeds: [embed], ephemeral: true });
       return;
     }

    // Update user balance in gc_balances table
    const { data: currentBalance, error: fetchError } = await supabase
      .from('gc_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching user balance:', fetchError);
      await interaction.reply({ content: 'Error fetching user balance', ephemeral: true });
      return;
    }

    const currentBalanceValue = currentBalance?.balance || 0;
    let newBalance;

    if (type === 'deposit') {
      newBalance = parseFloat(currentBalanceValue) + amount;
    } else if (type === 'withdraw') {
      if (parseFloat(currentBalanceValue) < amount) {
        await interaction.reply({ content: 'Insufficient balance for withdrawal', ephemeral: true });
        return;
      }
      newBalance = parseFloat(currentBalanceValue) - amount;
    }

    // Update balance
    const { error: updateError } = await supabase
      .from('gc_balances')
      .update({ balance: newBalance })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating user balance:', updateError);
      await interaction.reply({ content: 'Error updating user balance', ephemeral: true });
      return;
    }

    // Log transaction
    const { error: transactionError } = await supabase
      .from('gc_transactions')
      .insert({
        user_id: user.id,
        transaction_type: type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: amount,
        balance_before: currentBalanceValue,
        balance_after: newBalance,
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} via Discord ticket`
      });

    if (transactionError) {
      console.error('Error logging transaction:', transactionError);
    }

    // Update ticket status
    const { error: ticketError } = await supabase
      .from('support_tickets')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        processed_amount: amount
      })
      .eq('discord_channel_id', channelId);

    if (ticketError) {
      console.error('Error updating ticket status:', ticketError);
    }

    // Send confirmation message
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) {
             const embed = new EmbedBuilder()
         .setColor('#4ECDC4')
         .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} confirmed`)
         .setDescription(`${type === 'deposit' ? 'Deposited' : 'Withdrawn'} ${amount} GC`)
         .addFields(
           { name: 'User', value: `<@${userId}>`, inline: true },
           { name: 'Amount', value: `${amount} GC`, inline: true },
           { name: 'New balance', value: `${newBalance} GC`, inline: true }
         )
         .setTimestamp();

      await channel.send({ embeds: [embed] });
    }

    await interaction.reply({ 
      content: `${type.charAt(0).toUpperCase() + type.slice(1)} confirmed successfully`, 
      ephemeral: true 
    });

  } catch (error) {
    console.error('Error confirming transaction:', error);
    await interaction.reply({ content: 'Error confirming transaction', ephemeral: true });
  }
}

// Handle direct messages for ticket creation
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.type !== ChannelType.DM) return;

  const content = message.content.toLowerCase();
  
  if (content.includes('withdraw') || content.includes('deposit') || content.includes('support')) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Minecash support')
      .setDescription('Please use the website to create support tickets. This bot only handles automated ticket creation.')
      .addFields(
        { name: 'Website', value: 'https://minecash.com', inline: true },
        { name: 'Support', value: 'Use the website buttons to create tickets', inline: true }
      )
      .setFooter({ text: 'Minecash support system' });

    await message.reply({ embeds: [embed] });
  }
});

// Export functions for external use
module.exports = {
  createTicket,
  isUserInServer,
  hasAdminRoleInDatabase,
  client
};

// Start the bot
client.login(config.botToken);

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
}); 
