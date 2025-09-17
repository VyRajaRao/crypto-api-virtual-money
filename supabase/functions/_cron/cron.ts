// Supabase Cron Schedule Configuration
// This file defines the scheduling for Edge Functions

export const cronSchedule = {
  // Refresh cryptocurrency prices every 60 seconds
  "prices-refresh": {
    schedule: "*/60 * * * * *", // Every 60 seconds
    timezone: "UTC",
    description: "Fetches latest cryptocurrency prices from CoinGecko API"
  },
  
  // Check price alerts every 30 seconds (more frequent for real-time alerts)
  "alerts-check": {
    schedule: "*/30 * * * * *", // Every 30 seconds
    timezone: "UTC", 
    description: "Monitors active price alerts and triggers notifications"
  }
}

// Alternative schedules for production (less frequent to respect rate limits)
export const productionCronSchedule = {
  // Refresh prices every 5 minutes in production
  "prices-refresh": {
    schedule: "0 */5 * * * *", // Every 5 minutes
    timezone: "UTC",
    description: "Fetches latest cryptocurrency prices from CoinGecko API"
  },
  
  // Check alerts every 2 minutes in production
  "alerts-check": {
    schedule: "0 */2 * * * *", // Every 2 minutes
    timezone: "UTC",
    description: "Monitors active price alerts and triggers notifications"
  }
}

/*
CRON SETUP INSTRUCTIONS:

1. Deploy the Edge Functions:
   supabase functions deploy prices-refresh
   supabase functions deploy alerts-check

2. Set up the cron schedules using Supabase CLI or Dashboard:

   For development (frequent updates):
   supabase functions schedule prices-refresh --cron "*/60 * * * * *"
   supabase functions schedule alerts-check --cron "*/30 * * * * *"

   For production (less frequent):
   supabase functions schedule prices-refresh --cron "0 */5 * * * *"
   supabase functions schedule alerts-check --cron "0 */2 * * * *"

3. Verify schedules are active:
   supabase functions list-schedules

4. Monitor function logs:
   supabase functions logs prices-refresh --follow
   supabase functions logs alerts-check --follow

ENVIRONMENT VARIABLES REQUIRED:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Service role key for database access
- Set these in your Supabase project settings under Edge Functions secrets

RATE LIMITS CONSIDERATION:
- CoinGecko free tier allows 5-50 calls/minute depending on endpoints
- Adjust cron frequencies based on your usage patterns
- Consider upgrading to CoinGecko Pro for higher limits in production

MONITORING:
- Edge Functions logs are available in Supabase Dashboard
- Failed function invocations will be logged with error details
- Set up monitoring alerts for critical function failures
*/
