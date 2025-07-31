# MineCash Discord Bot API Documentation

## Overview
This API allows your casino website to create Discord tickets for deposits, withdrawals, and support requests. All tickets are created in your Discord server and can be managed by admins.

## Base URL
```
https://your-domain.com
```

## Authentication
All API requests require authentication using a Bearer token:
```
Authorization: Bearer YOUR_SECRET_KEY
```

## API Endpoints

### 1. Health Check
**GET** `/health`

Check if the API server is running.

**Response:**
```json
{
  "success": true,
  "message": "Discord bot server is running"
}
```

### 2. Check User in Discord Server
**POST** `/check-user`

Verify if a user is a member of your Discord server.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_SECRET_KEY
```

**Body:**
```json
{
  "userId": "287191388297101314"
}
```

**Response:**
```json
{
  "success": true,
  "inServer": true,
  "message": "User is in server"
}
```

### 3. Create Ticket
**POST** `/create-ticket`

Create a Discord ticket for deposits, withdrawals, or support.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_SECRET_KEY
```

## Ticket Types

### Support Ticket
**Use Case:** General support requests, account issues, questions

**Request:**
```json
{
  "userId": "287191388297101314",
  "type": "support",
  "description": "Need help with my account"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully: support-abc123",
  "data": {
    "channelId": "1234567890123456789",
    "channelName": "support-abc123"
  }
}
```

### Deposit Ticket
**Use Case:** User wants to add money to their casino balance

**Request:**
```json
{
  "userId": "287191388297101314",
  "type": "deposit",
  "amount": 100,
  "description": "Deposit request for 100 GC"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully: deposit-xyz789",
  "data": {
    "channelId": "1234567890123456789",
    "channelName": "deposit-xyz789"
  }
}
```

### Withdraw Ticket
**Use Case:** User wants to withdraw money from their casino balance

**Request:**
```json
{
  "userId": "287191388297101314",
  "type": "withdraw",
  "amount": 50,
  "description": "Withdraw request for 50 GC"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully: withdraw-def456",
  "data": {
    "channelId": "1234567890123456789",
    "channelName": "withdraw-def456"
  }
}
```

## Website Integration Examples

### JavaScript Examples

#### 1. Support Button
```javascript
async function createSupportTicket(userId, description) {
  try {
    const response = await fetch('https://your-domain.com/create-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SECRET_KEY'
      },
      body: JSON.stringify({
        userId: userId,
        type: 'support',
        description: description
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Support ticket created! Check Discord for updates.');
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    alert('Failed to create ticket. Please try again.');
  }
}

// Usage
createSupportTicket('287191388297101314', 'Need help with my account');
```

#### 2. Deposit Button
```javascript
async function createDepositTicket(userId, amount, description) {
  try {
    const response = await fetch('https://your-domain.com/create-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SECRET_KEY'
      },
      body: JSON.stringify({
        userId: userId,
        type: 'deposit',
        amount: amount,
        description: description
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert(`Deposit ticket created for ${amount} GC! Check Discord for confirmation.`);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    alert('Failed to create deposit ticket. Please try again.');
  }
}

// Usage
createDepositTicket('287191388297101314', 100, 'Deposit request for 100 GC');
```

#### 3. Withdraw Button
```javascript
async function createWithdrawTicket(userId, amount, description) {
  try {
    const response = await fetch('https://your-domain.com/create-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SECRET_KEY'
      },
      body: JSON.stringify({
        userId: userId,
        type: 'withdraw',
        amount: amount,
        description: description
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert(`Withdraw ticket created for ${amount} GC! Check Discord for confirmation.`);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    alert('Failed to create withdraw ticket. Please try again.');
  }
}

// Usage
createWithdrawTicket('287191388297101314', 50, 'Withdraw request for 50 GC');
```

### HTML Button Examples

#### Support Button
```html
<button onclick="createSupportTicket('287191388297101314', 'Need help with my account')">
  Get Support
</button>
```

#### Deposit Button
```html
<button onclick="createDepositTicket('287191388297101314', 100, 'Deposit request for 100 GC')">
  Deposit 100 GC
</button>
```

#### Withdraw Button
```html
<button onclick="createWithdrawTicket('287191388297101314', 50, 'Withdraw request for 50 GC')">
  Withdraw 50 GC
</button>
```

## Error Responses

### User Not in Discord Server
```json
{
  "success": false,
  "error": "User not found in Discord server"
}
```

### Invalid Amount
```json
{
  "success": false,
  "error": "Amount must be between 50 and 500 GC"
}
```

### Missing Required Fields
```json
{
  "success": false,
  "error": "User ID and type required"
}
```

### Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Discord Bot Commands

Once tickets are created, admins can use these Discord commands:

### `/confirm`
- Confirms a deposit or withdrawal ticket
- Adds/subtracts money from user's balance
- Only works in ticket channels
- Admin role required

### `/close`
- Closes a ticket and deletes the channel
- Only works in ticket channels
- Admin role required

### `/checkuser <userid>`
- Checks if a user is in the Discord server
- Works anywhere in the server

## Security Notes

1. **User Verification**: Only Discord server members can create tickets
2. **Admin Only**: Only users with admin role can confirm/close tickets
3. **Authentication**: All API requests require valid Bearer token
4. **Amount Limits**: Deposits/withdrawals limited to 50-500 GC

## Setup Requirements

1. **Discord Bot**: Must be online to create tickets and handle commands
2. **API Server**: Must be running to handle website requests
3. **Database**: Supabase connection for user and ticket data
4. **Environment Variables**: All required Discord and database credentials

## Testing

Test your API endpoints using curl:

```bash
# Health check
curl https://your-domain.com/health

# Check user
curl -X POST https://your-domain.com/check-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{"userId": "287191388297101314"}'

# Create support ticket
curl -X POST https://your-domain.com/create-ticket \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{"userId": "287191388297101314", "type": "support", "description": "Test support"}'
``` 