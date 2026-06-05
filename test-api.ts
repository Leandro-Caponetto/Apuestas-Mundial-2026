import dotenv from 'dotenv';
dotenv.config();

const key = process.env.RAPIDAPI_FOOTBALL_KEY;
console.log('Using Key:', key ? `${key.substring(0, 10)}...` : 'undefined');

async function test() {
  if (!key) {
    console.error('No key configured!');
    return;
  }

  // Let's test season 2026
  try {
    console.log('Fetching League 1 (World Cup) for Season 2026...');
    const res2026 = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2026', {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (res2026.ok) {
      const data2026 = await res2026.json();
      console.log('2026 Fixtures Count:', data2026.response ? data2026.response.length : 'none');
      if (data2026.response && data2026.response.length > 0) {
        console.log('Sample 2026 fixture home vs away:', 
          data2026.response[0].teams.home.name, 'vs', data2026.response[0].teams.away.name
        );
        return; // Success, we have 2026 fixtures!
      }
    } else {
      console.error('2026 failed:', res2026.status, await res2026.text());
    }
  } catch (err: any) {
    console.error('Error fetching 2026:', err.message);
  }

  // Test season 2022
  try {
    console.log('Fetching League 1 (World Cup) for Season 2022...');
    const res2022 = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2022', {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (res2022.ok) {
      const data2022 = await res2022.json();
      console.log('2022 Fixtures Count:', data2022.response ? data2022.response.length : 'none');
      if (data2022.response && data2022.response.length > 0) {
        console.log('Sample 2022 fixture home vs away:', 
          data2022.response[0].teams.home.name, 'vs', data2022.response[0].teams.away.name
        );
      }
    } else {
      console.error('2022 failed:', res2022.status, await res2022.text());
    }
  } catch (err: any) {
    console.error('Error fetching 2022:', err.message);
  }
}

test();
