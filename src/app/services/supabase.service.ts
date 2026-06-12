import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { PlayerProfile, CompletedGame, ScoreLog, GameState } from './game.interfaces';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase!: SupabaseClient;
  public isConfigured = false;
  
  // Track the logged in user state
  private userSub = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSub.asObservable();

  // Subject to notify Tab3 if recovery/password reset redirect event triggers
  public passwordRecovery$ = new BehaviorSubject<boolean>(false);

  constructor(private router: Router) {
    // Initialize the Supabase Client
    const supabaseUrl = (environment as any).supabaseUrl || 'YOUR_SUPABASE_URL';
    const supabaseKey = (environment as any).supabaseKey || 'YOUR_SUPABASE_ANON_KEY';
    
    this.isConfigured = !!supabaseUrl && 
                        supabaseUrl.startsWith('http') && 
                        supabaseUrl !== 'YOUR_SUPABASE_URL' && 
                        supabaseKey !== 'YOUR_SUPABASE_ANON_KEY';

    if (this.isConfigured) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: true, // Persists the session in local storage / preferences
            autoRefreshToken: true
          }
        });
        // Initialize Auth Listener & Auto-login
        this.initAuth();
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        this.isConfigured = false;
        this.setupPlaceholderClient();
      }
    } else {
      console.warn('Supabase is not configured or uses placeholder credentials. Running in local-only offline mode.');
      this.setupPlaceholderClient();
    }
  }

  private setupPlaceholderClient() {
    this.supabase = createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  // ==========================================
  // Authentication & Session Management
  // ==========================================

  private async initAuth() {
    // 1. Get initial session
    const { data: { session } } = await this.supabase.auth.getSession();
    this.userSub.next(session?.user || null);

    // 2. Set up auth state change listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase Auth Event: ${event}`);
      this.userSub.next(session?.user || null);
      if (event === 'PASSWORD_RECOVERY') {
        this.passwordRecovery$.next(true);
        this.router.navigateByUrl('/tabs/tab3');
      }
    });

    // 3. Auto-login: If no user is logged in, log them in anonymously so they are "logged in always"
    if (!session) {
      try {
        console.log('No session found. Logging in anonymously...');
        await this.signInAnonymously();
      } catch (err) {
        console.error('Failed to auto-login anonymously:', err);
      }
    }
  }

  /**
   * Signs in the user anonymously (creates a secure background account).
   */
  async signInAnonymously(): Promise<User | null> {
    const { data, error } = await this.supabase.auth.signInAnonymously();
    if (error) throw error;
    this.userSub.next(data.user);
    return data.user;
  }

  /**
   * Signs up a user with an email and password (promotes anonymous account if logged in).
   */
  async signUp(email: string, password: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/tabs/tab3'
      }
    });
    if (error) throw error;
    return data.user;
  }

  /**
   * Signs in a user with an email and password.
   */
  async signIn(email: string, password: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data.user;
  }

  /**
   * Signs out the current user. Note: Signing out will trigger a new anonymous login via the auth listener.
   */
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.userSub.next(null);
  }

  /**
   * Sends a password reset email to the user.
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/tabs/tab3'
    });
    if (error) throw error;
  }

  /**
   * Updates the authenticated user's password.
   */
  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  /**
   * Gets the current user object.
   */
  getCurrentUser(): User | null {
    return this.userSub.value;
  }

  // ==========================================
  // 1. Players Management (User-Isolated)
  // ==========================================

  /**
   * Fetches player profiles owned by the current user.
   */
  async getPlayers(): Promise<PlayerProfile[]> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      created: new Date(row.created_at).getTime()
    }));
  }

  /**
   * Saves or updates a player profile associated with the current user.
   */
  async savePlayer(profile: PlayerProfile): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('players')
      .upsert({
        id: profile.id,
        name: profile.name,
        created_at: new Date(profile.created).toISOString(),
        user_id: user.id
      });

    if (error) throw error;
  }

  /**
   * Deletes a player profile.
   */
  async deletePlayer(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==========================================
  // 2. Games History Management (User-Isolated)
  // ==========================================

  /**
   * Fetches all completed games owned by the current user.
   */
  async getGamesHistory(): Promise<CompletedGame[]> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('games')
      .select(`
        *,
        score_logs (*)
      `)
      .eq('user_id', user.id)
      .order('played_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => {
      const logs: ScoreLog[] = (row.score_logs || []).map((l: any) => ({
        id: l.id,
        player: l.player_index,
        delta: l.delta,
        newScore: l.new_score,
        reason: l.reason,
        timestamp: new Date(l.logged_at).getTime()
      }));

      // Sort logs by timestamp chronologically
      logs.sort((a, b) => a.timestamp - b.timestamp);

      return {
        id: row.id,
        mode: row.mode,
        player1Name: row.player1_name,
        player2Name: row.player2_name,
        player3Name: row.player3_name || undefined,
        player4Name: row.player4_name || undefined,
        player1Score: row.player1_score,
        player2Score: row.player2_score,
        player3Score: row.player3_score !== null ? row.player3_score : undefined,
        player4Score: row.player4_score !== null ? row.player4_score : undefined,
        winner: row.winner,
        scoreLogs: logs,
        date: new Date(row.played_at).getTime(),
        duration: row.duration_ms,
        excluded: row.excluded || false
      };
    });
  }

  /**
   * Saves a completed game history record associated with the current user.
   */
  async saveGame(game: CompletedGame): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Save the main game record
    const { error: gameError } = await this.supabase
      .from('games')
      .upsert({
        id: game.id,
        mode: game.mode || 2,
        player1_name: game.player1Name,
        player2_name: game.player2Name,
        player3_name: game.player3Name || null,
        player4_name: game.player4Name || null,
        player1_score: game.player1Score,
        player2_score: game.player2Score,
        player3_score: game.player3Score !== undefined ? game.player3Score : null,
        player4_score: game.player4Score !== undefined ? game.player4Score : null,
        winner: game.winner,
        played_at: new Date(game.date).toISOString(),
        duration_ms: game.duration,
        user_id: user.id,
        excluded: game.excluded || false
      });

    if (gameError) throw gameError;

    // 2. Save all associated score logs
    if (game.scoreLogs && game.scoreLogs.length > 0) {
      const logsToInsert = game.scoreLogs.map(log => ({
        id: log.id,
        game_id: game.id,
        player_index: log.player,
        delta: log.delta,
        new_score: log.newScore,
        reason: log.reason,
        logged_at: new Date(log.timestamp).toISOString()
      }));

      const { error: logsError } = await this.supabase
        .from('score_logs')
        .upsert(logsToInsert);

      if (logsError) throw logsError;
    }
  }

  /**
   * Deletes a game and all its logs.
   */
  async deleteGame(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('games')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==========================================
  // 3. Active Game State Sync (User-Isolated)
  // ==========================================

  /**
   * Saves the transient state of an active/current game.
   */
  async saveActiveGameState(state: GameState): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('active_game_states')
      .upsert({
        user_id: user.id,
        state: state,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Loads the transient state of an active/current game.
   */
  async getActiveGameState(): Promise<GameState | null> {
    const user = this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('active_game_states')
      .select('state')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data?.state as GameState;
  }

  // ==========================================
  // 4. Local Storage Migration Helper
  // ==========================================

  /**
   * Scans local storage for existing profiles and history, and syncs them to the current user's profile.
   */
  async syncLocalStorageToSupabase(): Promise<{ playersSynced: number, gamesSynced: number }> {
    let playersSynced = 0;
    let gamesSynced = 0;

    // Ensure we are logged in before running migration
    let user = this.getCurrentUser();
    if (!user) {
      user = await this.signInAnonymously();
    }
    if (!user) throw new Error('Could not authenticate user for migration');

    // A. Sync Players
    const localPlayersStr = localStorage.getItem('cribbage_player_profiles');
    if (localPlayersStr) {
      try {
        const localPlayers: PlayerProfile[] = JSON.parse(localPlayersStr);
        for (const player of localPlayers) {
          await this.savePlayer(player);
          playersSynced++;
        }
      } catch (e) {
        console.error('Error migrating player profiles', e);
      }
    }

    // B. Sync Games History
    const localGamesStr = localStorage.getItem('cribbage_games_history');
    if (localGamesStr) {
      try {
        const localGames: CompletedGame[] = JSON.parse(localGamesStr);
        for (const game of localGames) {
          await this.saveGame(game);
          gamesSynced++;
        }
      } catch (e) {
        console.error('Error migrating completed games', e);
      }
    }

    return { playersSynced, gamesSynced };
  }
}
