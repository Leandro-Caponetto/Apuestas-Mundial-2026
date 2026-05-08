-- Tables Setup
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  flag_url TEXT,
  group_name TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  start_at TIMESTAMPTZ NOT NULL,
  phase TEXT NOT NULL, -- 'group', 'round_16', 'quarter', 'semi', 'final'
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'playing', 'finished'
  group_name TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  balance NUMERIC(15,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  items JSONB NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  odds NUMERIC(10,2) NOT NULL,
  potential_win NUMERIC(15,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RPC for atomic betting
CREATE OR REPLACE FUNCTION place_bet_atomic(
  p_user_id UUID,
  p_items JSONB,
  p_amount NUMERIC,
  p_odds NUMERIC,
  p_potential_win NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_bet_id UUID;
BEGIN
  -- 1. Check balance
  SELECT balance INTO v_current_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- 2. Deduct balance
  UPDATE profiles SET balance = balance - p_amount WHERE id = p_user_id;

  -- 3. Insert bet
  INSERT INTO bets (user_id, items, amount, odds, potential_win, status)
  VALUES (p_user_id, p_items, p_amount, p_odds, p_potential_win, 'pending')
  RETURNING id INTO v_new_bet_id;

  RETURN jsonb_build_object(
    'success', true, 
    'bet_id', v_new_bet_id,
    'new_balance', (v_current_balance - p_amount)
  );
END;
$$;

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  match_id UUID REFERENCES matches(id) NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_metadata (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for tournament_metadata
ALTER TABLE tournament_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tournament metadata is viewable by everyone" ON tournament_metadata;
CREATE POLICY "Tournament metadata is viewable by everyone" ON tournament_metadata FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update tournament metadata" ON tournament_metadata;
CREATE POLICY "Admins can update tournament metadata" ON tournament_metadata 
  FOR ALL USING (auth.jwt() ->> 'email' = 'caponettopeppers@gmail.com');

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON matches;
CREATE POLICY "Matches are viewable by everyone" ON matches FOR SELECT USING (true);

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bets" ON bets;
CREATE POLICY "Users can view their own bets" ON bets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own bets" ON bets;
CREATE POLICY "Users can delete their own bets" ON bets FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Bets are viewable by everyone for community board" ON bets;
CREATE POLICY "Bets are viewable by everyone for community board" ON bets FOR SELECT USING (true);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Predictions viewable by owner" ON predictions;
CREATE POLICY "Predictions viewable by owner" ON predictions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own predictions" ON predictions;
CREATE POLICY "Users can insert own predictions" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own predictions" ON predictions;
CREATE POLICY "Users can update own predictions" ON predictions FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leagues viewable by members" ON leagues;
CREATE POLICY "Leagues viewable by members" ON leagues FOR SELECT USING (
  EXISTS (SELECT 1 FROM league_members WHERE league_id = leagues.id AND user_id = auth.uid())
);

-- Functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
