-- Migration: Add trigger to detect campaign completion and call Supabase Edge Function
-- This trigger fires when a campaign's calls_completed equals contacts_count

-- Create a function to call the Supabase Edge Function via HTTP
CREATE OR REPLACE FUNCTION notify_campaign_completion()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  api_key TEXT;
  payload JSONB;
BEGIN
  -- Only trigger if campaign is completed (calls_completed >= contacts_count)
  IF NEW.calls_completed >= NEW.contacts_count AND NEW.contacts_count > 0 AND NEW.status != 'completed' THEN
    -- Update status to completed
    NEW.status := 'completed';
    
    -- Get edge function URL from environment (stored in settings or use default)
    -- You can also hardcode this or use a configuration table
    edge_function_url := COALESCE(
      current_setting('app.edge_function_url', TRUE),
      'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-call-logs-report'
    );
    
    -- Build payload
    payload := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'owner_user_id', NEW.owner_user_id,
        'contacts_count', NEW.contacts_count,
        'calls_completed', NEW.calls_completed,
        'status', 'completed'
      )
    );
    
    -- Call the edge function asynchronously (non-blocking)
    -- Note: This requires the http extension to be enabled
    -- If http extension is not available, use pg_net or Supabase's built-in webhook
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', TRUE)
      ),
      body := payload::text
    );
    
    RAISE NOTICE 'Campaign % completed. Triggered call logs report.', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative: Use Supabase's built-in webhook/function call
-- If the above doesn't work, you can use a simpler approach with pg_net
-- or create a database webhook that calls the edge function

-- Create trigger
DROP TRIGGER IF EXISTS trigger_campaign_completion ON genie_scheduled_calls;
CREATE TRIGGER trigger_campaign_completion
  BEFORE UPDATE ON genie_scheduled_calls
  FOR EACH ROW
  WHEN (
    -- Only trigger when calls_completed changes and equals contacts_count
    (NEW.calls_completed >= NEW.contacts_count AND NEW.contacts_count > 0)
    AND (OLD.calls_completed < OLD.contacts_count OR OLD.calls_completed IS NULL)
  )
  EXECUTE FUNCTION notify_campaign_completion();

-- Note: If pg_net extension is not available, you may need to:
-- 1. Enable the extension: CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2. Or use Supabase's database webhooks feature instead
-- 3. Or use a scheduled job that checks for completed campaigns

COMMENT ON FUNCTION notify_campaign_completion() IS 
  'Triggers when a campaign is completed (calls_completed >= contacts_count) and calls the edge function to send call logs report';
