
import { createClient } from
    'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = "https://xelefkbalbdisduczdah.supabase.co";
const SUPABASE_KEY = "sb_publishable_2RHHou4QgRa1doL0h-rejw_zCSEQtFL";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


