import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { MOCK_MATCHES } from './src/lib/mockData';
import { WORLD_CUP_TEAMS } from './src/lib/constants';

dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Missing Supabase credentials in environment!');
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey);

  console.log('=== SEEDER OFICIAL - COPA DEL MUNDO CATAR 2022 ===');
  console.log('Conectando a:', supabaseUrl);

  try {
    // 1. Clean old schema records to avoid violations
    console.log('\n[1/5] Limpiando predicciones anteriores...');
    await client.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[2/5] Limpiando partidos existentes...');
    await client.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Insert/Upsert the 32 real teams
    console.log('[3/5] Cargando selecciones de Catar 2022...');
    const teamsToUpsert = WORLD_CUP_TEAMS.map(t => ({
      name: t.name,
      code: t.code,
      flag_url: t.flag_url,
      group_name: t.group_name
    }));

    const { data: dbTeams, error: teamsError } = await client
      .from('teams')
      .upsert(teamsToUpsert, { onConflict: 'code' })
      .select('id, code, name');

    if (teamsError) {
      console.warn('⚠️ No se pudieron registrar o actualizar las selecciones por políticas RLS. Detalles:', teamsError.message);
      console.log('👉 Se continuará con los equipos que ya existan en la base de datos.');
    } else {
      console.log(`✅ ¡Se registraron/actualizaron ${dbTeams?.length} selecciones con éxito!`);
    }

    // Double check teams in database to construct the ID map
    const { data: finalTeams, error: fetchTeamsError } = await client.from('teams').select('id, code, name');
    if (fetchTeamsError || !finalTeams || finalTeams.length === 0) {
      throw new Error('No hay selecciones disponibles en la base de datos para mapear los partidos.');
    }

    const teamMap = new Map<string, string>(
      finalTeams.map(t => [t.code.toUpperCase(), t.id])
    );

    // 3. Delete from DB teams that are not part of Qatar 2022 (retired teams from custom 48-team format)
    console.log('[4/5] Depurando selecciones antiguas o excedentes fuera del Mundial 2022...');
    const qatarCodes = WORLD_CUP_TEAMS.map(t => t.code.toUpperCase());
    const retiredTeams = finalTeams.filter(t => !qatarCodes.includes(t.code.toUpperCase()));
    
    if (retiredTeams.length > 0) {
      console.log(`⚠️ Se detectaron ${retiredTeams.length} selecciones anteriores de formato 48-equipos. Eliminando de forma segura...`);
      for (const rt of retiredTeams) {
        await client.from('teams').delete().eq('id', rt.id);
      }
      console.log('✅ Depuración de selecciones excedentes completada.');
    }

    // 4. Generate SQL Script
    console.log('[5/5] Generando script SQL de restauración...');
    let sqlContent = `-- SCRIPT SQL AUTO-GENERADO PARA RESTABLECER EL CALENDARIO REAL DEL MUNDIAL 2026\n`;
    sqlContent += `-- Copia todo este código y ejecútalo en el "SQL Editor" de tu consola de Supabase\n\n`;
    sqlContent += `BEGIN;\n\n`;
    sqlContent += `-- Limpiar predicciones y partidos existentes\n`;
    sqlContent += `DELETE FROM predictions;\n`;
    sqlContent += `DELETE FROM matches;\n\n`;
    sqlContent += `-- Insertar las selecciones de la Copa del Mundo 2026 (Groups A a L) si no existen\n`;
    
    WORLD_CUP_TEAMS.forEach(t => {
      sqlContent += `INSERT INTO teams (name, code, group_name, flag_url) VALUES ('${t.name.replace(/'/g, "''")}', '${t.code}', '${t.group_name}', '${t.flag_url}') ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, group_name=EXCLUDED.group_name, flag_url=EXCLUDED.flag_url;\n`;
    });

    sqlContent += `\n-- Insertar los 72 partidos de fase de grupos con subconsultas SQL\n`;
    sqlContent += `INSERT INTO matches (home_team_id, away_team_id, start_at, phase, status, group_name) VALUES \n`;

    const mappedRows: string[] = [];

    for (const match of MOCK_MATCHES) {
      const homeCode = (match.home_team_id || '').toUpperCase();
      const awayCode = (match.away_team_id || '').toUpperCase();

      mappedRows.push(`  ((SELECT id FROM teams WHERE code = '${homeCode}' LIMIT 1), (SELECT id FROM teams WHERE code = '${awayCode}' LIMIT 1), '${match.start_at}', 'group', 'pending', '${match.group_name}')`);
    }

    sqlContent += mappedRows.join(',\n') + ';\n\n';
    sqlContent += `COMMIT;\n`;

    fs.writeFileSync('./insert_official_fixtures.sql', sqlContent, 'utf-8');
    console.log('📝 ¡Script SQL generado con éxito y guardado en: ./insert_official_fixtures.sql!');

    // 5. Direct DB Impact guidance
    console.log('\n[Sugerencia] Copia y ejecuta el contenido del script "insert_official_fixtures.sql" en el panel de control SQL de tu Supabase.');

  } catch (err: any) {
    console.error('❌ Ocurrió un error inesperado durante el sembrado y sincronización:', err.message);
  }
}

run();
