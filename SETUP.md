# MineCash Discord Bot Setup Guide

This guide will help you set up the MineCash Discord bot for handling support tickets and user management.

## Prerequisites

- Node.js (v16 or higher)
- A Discord server with admin permissions
- Supabase project with service role key

## Step 1: Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Go to "OAuth2" > "URL Generator"
6. Select the following scopes:
   - `bot`
   - `applications.commands`
7. Select the following bot permissions:
   - `Manage Channels`
   - `Send Messages`
   - `Use Slash Commands`
   - `Read Message History`
   - `Manage Messages`
   - `View Channels`
8. Copy the generated URL and invite the bot to your server

## Step 2: Environment Variables

Create a `.env` file in the `discord-bot` directory with the following variables:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
ADMIN_ROLE_ID=your_admin_role_id_here

# Category IDs for different ticket types
SUPPORT_CATEGORY_ID=your_support_category_id_here
DEPOSIT_WITHDRAW_CATEGORY_ID=your_deposit_withdraw_category_id_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Bot Secret (for API authentication)
DISCORD_BOT_SECRET=your_custom_secret_here
```

### How to get the required IDs:

1. **Guild ID**: Right-click your server name and select "Copy Server ID"
2. **Admin Role ID**: Go to Server Settings > Roles, right-click the admin role and select "Copy Role ID"
3. **Category IDs**: 
   - Create two categories in your Discord server:
     - One for support tickets (e.g., "Support Tickets")
     - One for deposit/withdraw tickets (e.g., "Transactions")
   - Right-click each category and select "Copy Category ID"

## Step 3: Install Dependencies

```bash
cd discord-bot
npm install
```

## Step 4: Deploy Slash Commands

```bash
node deploy-commands.js
```

## Step 5: Start the Bot

```bash
npm start
```

The bot should now be online and ready to handle:
- User server membership checks
- Support ticket creation
- Deposit/withdrawal ticket creation
- Interactive buttons for ticket management

## Step 6: Supabase Edge Function Setup

1. Deploy the Edge Function:
```bash
supabase functions deploy discord-bot
```

2. Set the environment variables in Supabase:
```bash
supabase secrets set DISCORD_BOT_URL=http://localhost:3001
supabase secrets set DISCORD_BOT_SECRET=your_custom_secret_here
```

## Features

### Ticket Categories
- **Support Tickets**: Created from the support page, go to the support category
- **Deposit/Withdraw Tickets**: Created from the profile page, go to the deposit/withdraw category

### Interactive Buttons
- **Close Ticket**: Available on all ticket types, closes the ticket and deletes the channel
- **Confirm Deposit/Withdraw**: Available on deposit/withdraw tickets, processes the transaction and updates user balance

### Database Integration
- All tickets are logged to the `support_tickets` table
- Transaction confirmations update user balances in the `profiles` table
- Ticket status tracking (open, closed, completed)

## Testing

1. Test user membership check:
```bash
curl -X POST "http://localhost:3001/check-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret" \
  -d '{"userId":"your_discord_user_id"}'
```

2. Test ticket creation:
```bash
curl -X POST "http://localhost:3001/create-ticket" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret" \
  -d '{"userId":"your_discord_user_id","type":"deposit","amount":100,"description":"Test deposit"}'
```

## Troubleshooting

- Make sure all environment variables are set correctly
- Verify the bot has the required permissions in your Discord server
- Check that the category IDs are valid and the bot can access them
- Ensure the Supabase service role key has the necessary permissions 