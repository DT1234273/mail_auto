import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const supabase = createClient('https://example.supabase.co', 'apikey', {
  realtime: {
    transport: WebSocket as any
  }
});
console.log('created client');
