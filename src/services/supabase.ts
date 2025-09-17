import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseBet, BetMetadata, BetStatus } from '../types';

/**
 * Service class for handling Supabase database operations
 * Manages bet storage, metadata hosting, and database queries
 */
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing. Please check your environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Insert a new bet into the database
   */
  public async insertBet(bet: Omit<DatabaseBet, 'id'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .insert([bet])
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Failed to insert bet: ${error.message}`);
      }

      return data.id;
    } catch (error: any) {
      console.error('Insert bet failed:', error);
      throw new Error(`Failed to insert bet: ${error.message}`);
    }
  }

  /**
   * Update an existing bet in the database
   */
  public async updateBet(
    betId: string,
    updates: Partial<Omit<DatabaseBet, 'id' | 'created_date_utc'>>
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        last_updated_date_utc: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('bets')
        .update(updateData)
        .eq('id', betId);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`Failed to update bet: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Update bet failed:', error);
      throw new Error(`Failed to update bet: ${error.message}`);
    }
  }

  /**
   * Get all open bets from the database
   */
  public async getOpenBets(): Promise<DatabaseBet[]> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .eq('status', 'open')
        .order('created_date_utc', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Failed to fetch open bets: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Get open bets failed:', error);
      throw new Error(`Failed to get open bets: ${error.message}`);
    }
  }

  /**
   * Get all bets from the database regardless of status
   */
  public async getAllBets(): Promise<DatabaseBet[]> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .order('created_date_utc', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Failed to fetch all bets: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Get all bets failed:', error);
      throw new Error(`Failed to get all bets: ${error.message}`);
    }
  }

  /**
   * Get bets by status
   */
  public async getBetsByStatus(status: BetStatus): Promise<DatabaseBet[]> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .eq('status', status)
        .order('created_date_utc', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Failed to fetch bets by status: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Get bets by status failed:', error);
      throw new Error(`Failed to get bets by status: ${error.message}`);
    }
  }

  /**
   * Get bets for a specific match
   */
  public async getMatchBets(matchId: string): Promise<DatabaseBet[]> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .eq('match_id', matchId)
        .order('created_date_utc', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Failed to fetch match bets: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Get match bets failed:', error);
      throw new Error(`Failed to get match bets: ${error.message}`);
    }
  }

  /**
   * Get bets created by a specific user
   */
  public async getUserCreatedBets(username: string): Promise<DatabaseBet[]> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .eq('creator_username', username)
        .order('created_date_utc', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Failed to fetch user created bets: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Get user created bets failed:', error);
      throw new Error(`Failed to get user created bets: ${error.message}`);
    }
  }

  /**
   * Get bets accepted by a specific user
   */
  public async getUserAcceptedBets(username: string): Promise<DatabaseBet[]> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .eq('acceptor_username', username)
        .order('created_date_utc', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Failed to fetch user accepted bets: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Get user accepted bets failed:', error);
      throw new Error(`Failed to get user accepted bets: ${error.message}`);
    }
  }

  /**
   * Upload bet metadata JSON to Supabase storage
   */
  public async uploadMetadata(betId: string, metadata: BetMetadata): Promise<string> {
    try {
      const fileName = `bet-${betId}.json`;
      const fileContent = JSON.stringify(metadata, null, 2);

      const { data, error } = await this.supabase.storage
        .from('metadata')
        .upload(fileName, fileContent, {
          contentType: 'application/json',
          upsert: true, // Allow overwriting existing files
        });

      if (error) {
        console.error('Supabase storage error:', error);
        throw new Error(`Failed to upload metadata: ${error.message}`);
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = this.supabase.storage
        .from('metadata')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Upload metadata failed:', error);
      throw new Error(`Failed to upload metadata: ${error.message}`);
    }
  }

  /**
   * Get metadata from Supabase storage
   */
  public async getMetadata(betId: string): Promise<BetMetadata> {
    try {
      const fileName = `bet-${betId}.json`;

      const { data, error } = await this.supabase.storage
        .from('metadata')
        .download(fileName);

      if (error) {
        console.error('Supabase storage error:', error);
        throw new Error(`Failed to download metadata: ${error.message}`);
      }

      const text = await data.text();
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Get metadata failed:', error);
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }

  /**
   * Delete metadata from Supabase storage
   */
  public async deleteMetadata(betId: string): Promise<void> {
    try {
      const fileName = `bet-${betId}.json`;

      const { error } = await this.supabase.storage
        .from('metadata')
        .remove([fileName]);

      if (error) {
        console.error('Supabase storage error:', error);
        throw new Error(`Failed to delete metadata: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Delete metadata failed:', error);
      throw new Error(`Failed to delete metadata: ${error.message}`);
    }
  }

  /**
   * Get a specific bet by ID
   */
  public async getBetById(betId: string): Promise<DatabaseBet | null> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('*')
        .eq('id', betId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Supabase query error:', error);
        throw new Error(`Failed to fetch bet: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Get bet by ID failed:', error);
      throw new Error(`Failed to get bet by ID: ${error.message}`);
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('bets')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Supabase connection test failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

