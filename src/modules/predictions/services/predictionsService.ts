import { supabase } from '@/modules/shared/services/supabaseClient';

export interface WatchlistItem {
  id: string;
  user_id: string;
  stock_code: string;
  created_at: string;
}

export interface Prediction {
  id: string;
  stock_code: string;
  target_date: string;
  predicted_price: number;
  created_at: string;
}

export const predictionsService = {
  async getWatchlist(): Promise<WatchlistItem[]> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_watchlists')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addToWatchlist(stockCode: string): Promise<WatchlistItem> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('User not authenticated');

    const code = stockCode.toUpperCase();
    
    // Check limit first
    const currentList = await this.getWatchlist();
    if (currentList.length >= 10) {
      throw new Error('Maksimal 10 saham di watchlist prediksi tercapai.');
    }

    const { data, error } = await supabase
      .from('user_watchlists')
      .insert([{ user_id: userData.user.id, stock_code: code }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeFromWatchlist(stockCode: string): Promise<void> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('User not authenticated');

    const code = stockCode.toUpperCase();

    const { error } = await supabase
      .from('user_watchlists')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('stock_code', code);

    if (error) throw error;
  },

  async getPredictions(stockCode: string): Promise<Prediction[]> {
    const code = stockCode.toUpperCase();
    
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('stock_code', code)
      .order('target_date', { ascending: true });

    if (error) throw error;
    
    // Fallback Dummy Data if no prediction found from AI
    if (!data || data.length === 0) {
      return this.generateDummyPredictions(code);
    }
    
    return data;
  },

  generateDummyPredictions(stockCode: string): Prediction[] {
    const dummy: Prediction[] = [];
    const today = new Date();
    
    // Generate for next 7 days
    let basePrice = stockCode === '^JKSE' ? 7300 : (stockCode === 'BBCA' ? 9800 : 5000);
    
    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      // Add random walk
      const change = (Math.random() - 0.45) * (basePrice * 0.02); // bias slightly up
      basePrice += change;
      
      dummy.push({
        id: `dummy-${i}`,
        stock_code: stockCode,
        target_date: targetDate.toISOString().split('T')[0],
        predicted_price: Math.round(basePrice),
        created_at: new Date().toISOString()
      });
    }
    
    return dummy;
  }
};
