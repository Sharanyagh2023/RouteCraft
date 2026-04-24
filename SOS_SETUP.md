# 🚨 SOS Alert System Setup Guide

## Overview
The SOS (Safety Assistance) system sends real-time location alerts to Telegram when the user clicks the emergency alert button. This guide will help you configure it.

## Prerequisites
- A Telegram account
- Access to @BotFather on Telegram to create a bot
- Your Telegram user ID (obtainable from @userinfobot)

---

## Step-by-Step Setup

### Step 1: Create a Telegram Bot
1. Open Telegram and go to [@BotFather](https://t.me/BotFather)
2. Send the command: `/newbot`
3. Follow the prompts:
   - Choose a name for your bot (e.g., "RouteCraft SOS")
   - Choose a username (must end with `bot`, e.g., `routecraft_sos_bot`)
4. BotFather will give you a **token** that looks like this:
   ```
   8719598925:AAGYP2cApSCBBbdd4awOnNB4DoEggc6z3QU
   ```
5. **This token is already configured** in `.env` file ✓

### Step 2: Get Your Telegram Chat ID ⚠️ CRITICAL
This step is **required** for SOS to work!

#### Option A: Get Your Personal User ID
1. Open Telegram and go to [@userinfobot](https://t.me/userinfobot)
2. Send any message (e.g., "hello")
3. @userinfobot will reply with your information including:
   - **User ID**: A number like `123456789`
4. Copy this number

#### Option B: Use a Telegram Group/Channel (Optional)
If you want alerts to go to a group:
1. Create a new Telegram group
2. Add your bot to the group (search for the bot username you created)
3. Get the group ID (ask @userinfobot in the group, or check debug logs)

### Step 3: Configure the Chat ID
1. Open the `.env` file in the project root:
   ```
   TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID
   ```
2. Replace `YOUR_TELEGRAM_CHAT_ID` with the number you got from @userinfobot
   - **Example**: `TELEGRAM_CHAT_ID=123456789`
   - For groups: `TELEGRAM_CHAT_ID=-987654321` (negative number)
3. **Save the file** (Ctrl+S)

### Step 4: Restart the Server
1. In your terminal, stop the server: `Ctrl+C`
2. Start the server again: `npm run dev`
3. You should see logs like:
   ```
   ✓ Vite server started on port 5173
   ✓ Express server running on port 3000
   ```

### Step 5: Test the SOS System
1. Open the RouteCraft app in your browser
2. Allow location access when prompted
3. Plan a route and start a journey
4. Click the **red alert button** (🚨) at the top right
5. Confirm the SOS alert popup
6. **Check your Telegram** - you should receive:
   - A message with "🚨 SOS ALERT 🚨" and your location coordinates
   - A location pin on the map

---

## How It Works

### Frontend (React)
1. User clicks the red alert button
2. App requests the user's location (GPS)
3. Shows confirmation dialog
4. Sends POST request to `/api/sos` with coordinates

### Backend (Express)
1. Receives the SOS request
2. Validates Telegram credentials from `.env`
3. Sends a formatted message to Telegram bot API
4. Includes:
   - Alert text with timestamp
   - Live location pin
   - Google Maps link to coordinates
5. Returns success/failure to frontend

### Telegram
- Bot receives message from your Express server
- Sends notification to you (the TELEGRAM_CHAT_ID user)
- You see emergency alert with location

---

## Troubleshooting

### ❌ Error: "SOS service is not configured"
**Cause**: Environment variables are missing or wrong

**Solutions**:
1. Check `.env` file exists in project root
2. Verify `TELEGRAM_BOT_TOKEN` is present and correct
3. Verify `TELEGRAM_CHAT_ID` is set (not the placeholder text)
4. Restart server after changing `.env`

### ❌ Error: "Failed to dispatch SOS alert"
**Cause**: Telegram API request failed

**Solutions**:
1. Check server terminal for detailed error (should show Telegram API response)
2. Verify bot token hasn't been revoked
3. Make sure your Chat ID is correct (test with @userinfobot)
4. Check internet connectivity

### ❌ Not receiving messages in Telegram
**Cause**: Configuration issue or Telegram notifications disabled

**Solutions**:
1. Verify Chat ID matches your Telegram user ID (from @userinfobot)
2. Message your bot first (in Telegram, search for the bot by username)
3. Check Telegram notification settings aren't muted
4. Make sure you used the correct user ID (not username)

### ❌ Cannot find @userinfobot
**Solution**: Use this link instead: [https://t.me/userinfobot](https://t.me/userinfobot)

---

## Environment Variables Reference

| Variable | Example | Source |
|----------|---------|--------|
| `TELEGRAM_BOT_TOKEN` | `8719598925:AAGYP2cApSCBBbdd4awOnNB4DoEggc6z3QU` | @BotFather |
| `TELEGRAM_CHAT_ID` | `123456789` | @userinfobot |

---

## Security Notes

⚠️ **IMPORTANT**:
- **Never** commit `.env` to Git (it contains sensitive credentials)
- Add `.env` to `.gitignore` (already done in this project)
- The bot token allows anyone to use your Telegram bot - keep it private
- Don't share `.env` file with others

---

## API Endpoint Reference

### SOS Alert Endpoint
```
POST /api/sos
Content-Type: application/json

{
  "lat": 13.0827,
  "lng": 80.2707,
  "locationUnavailableReason": null  // optional, if geolocation failed
}

Response (Success):
{
  "ok": true,
  "sentAt": 1704067200000,
  "hasCoords": true
}

Response (Error):
{
  "error": "SOS service is not configured",
  "details": "Missing TELEGRAM_CHAT_ID environment variable"
}
```

---

## Testing Without Real Telegram

If you want to test without setting up Telegram:
1. Comment out the SOS button code temporarily
2. Or mock the `/api/sos` endpoint to return success
3. Check server logs for any errors

---

## Feature Details

### SOS Cooldown
- After sending an SOS alert, you can send another after **45 seconds**
- This prevents accidental spam to emergency contacts
- Cooldown resets per device/IP

### Location Precision
- Uses GPS coordinates (lat/lng) when available
- Falls back to IP-based location if GPS unavailable
- Includes reason for geolocation failure in alert

### Message Format
```
🚨 SOS ALERT 🚨
User needs immediate help!

📍 Location:
https://maps.google.com/?q=13.0827,80.2707

🧭 Coordinates:
Lat: 13.0827
Lng: 80.2707

⏰ Time: [Timestamp in IST]
```

---

## Support

For issues:
1. Check server terminal for detailed error messages
2. Review troubleshooting section above
3. Verify `.env` file configuration
4. Check Telegram bot is properly created and not deactivated
5. Ensure internet connectivity to Telegram API

---

## Next Steps

After setup:
✅ Test SOS button with your location  
✅ Verify message received in Telegram  
✅ Share emergency contact with trusted people  
✅ Ensure app location permissions are enabled  

Happy traveling! 🚗
