-- Seed Data for Mundial 2026

-- Groups
-- Group A
INSERT INTO teams (name, code, group_name, flag_url) VALUES 
('México', 'MEX', 'A', 'https://flagcdn.com/w160/mx.png'),
('Estados Unidos', 'USA', 'A', 'https://flagcdn.com/w160/us.png'),
('Canadá', 'CAN', 'A', 'https://flagcdn.com/w160/ca.png'),
('Argentina', 'ARG', 'A', 'https://flagcdn.com/w160/ar.png');

-- Group B
INSERT INTO teams (name, code, group_name, flag_url) VALUES 
('Brasil', 'BRA', 'B', 'https://flagcdn.com/w160/br.png'),
('Francia', 'FRA', 'B', 'https://flagcdn.com/w160/fr.png'),
('España', 'ESP', 'B', 'https://flagcdn.com/w160/es.png'),
('Alemania', 'GER', 'B', 'https://flagcdn.com/w160/de.png');

-- Matches
-- Note: You would need to fetch the IDs from the teams table first to insert matches correctly in a real scenario
-- This is a template showing the structure

-- INSERT INTO matches (home_team_id, away_team_id, start_at, phase, group_name)
-- VALUES 
-- ((SELECT id FROM teams WHERE code = 'MEX'), (SELECT id FROM teams WHERE code = 'USA'), '2026-06-11 18:00:00+00', 'group', 'A'),
-- ((SELECT id FROM teams WHERE code = 'ARG'), (SELECT id FROM teams WHERE code = 'CAN'), '2026-06-12 15:00:00+00', 'group', 'A'),
-- ((SELECT id FROM teams WHERE code = 'BRA'), (SELECT id FROM teams WHERE code = 'FRA'), '2026-06-13 20:00:00+00', 'group', 'B');
