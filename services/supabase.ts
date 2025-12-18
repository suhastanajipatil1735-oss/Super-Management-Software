
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xvfptnkfeplzummznetq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_76amZriub0VHoGLjleH8Tw_KH6_ndnu';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface SupabaseUserStatus {
  mobile: string;
  institute_name: string;
  subscription_status: string;
  request_sent: boolean;
  acceptance: boolean;
}

/**
 * Register or update user info in Supabase
 */
export const syncUserToSupabase = async (mobile: string, instituteName: string, status: string = 'free') => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        mobile: mobile,
        institute_name: instituteName,
        subscription_status: status,
        // We don't overwrite request_sent or acceptance on login
      }, { onConflict: 'mobile' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Supabase Sync Error:", error);
    return false;
  }
};

/**
 * Send a subscription request to Supabase
 */
export const sendSubscriptionRequestToSupabase = async (mobile: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ request_sent: true })
      .eq('mobile', mobile);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Supabase Request Error:", error);
    return false;
  }
};

/**
 * Fetch current approval status from Supabase
 */
export const fetchUserSupabaseStatus = async (mobile: string): Promise<SupabaseUserStatus | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    return null;
  }
};
