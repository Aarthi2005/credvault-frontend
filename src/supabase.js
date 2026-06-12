import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://amjxbkgzvrcfjpqnlkic.supabase.co";

const supabaseAnonKey =
  "sb_publishable_HqW-BtkqwXgIra3QbKJAWQ_bf-EX_KL";

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export default supabase;