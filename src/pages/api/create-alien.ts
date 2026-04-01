// src/pages/api/create-alien.ts
import type { APIRoute } from 'astro';
import { createClient } from '@libsql/client';
import { ALIEN_TYPES } from '@/data/alien_types';

const isProduction = !!(import.meta.env.DATABASE_URL && import.meta.env.DATABASE_TOKEN);

const client = createClient(
  isProduction
    ? {
        url: import.meta.env.DATABASE_URL,
        authToken: import.meta.env.DATABASE_TOKEN,
      }
    : {
        url: 'file:local.db',
      }
);

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cuerpo de solicitud vacío',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'JSON inválido',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validations
    if (!data || !data.type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tipo es obligatorio',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const created_by = (data.created_by || '').toString().trim();
    if (!created_by) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'El nombre del creador es obligatorio',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (created_by.length < 3 || created_by.length > 15) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'El nombre del creador debe tener entre 3 y 15 caracteres',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if type exists
    const validType = ALIEN_TYPES.find((type) => type.slug === data.type);
    if (!validType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tipo de alien no válido',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate unique ID and timestamp
    const id = crypto.randomUUID();
    const created_at = Math.floor(Date.now() / 1000);

    // Generate next codename (A00001, A00002, ...)
    const lastAlien = await client.execute({
      sql: 'SELECT codename FROM aliens ORDER BY codename DESC LIMIT 1',
    });
    let nextCodeNum = 1;
    if (lastAlien.rows.length > 0) {
      const lastCodename = lastAlien.rows[0].codename as string;
      const numPart = parseInt(lastCodename.substring(1), 10);
      nextCodeNum = numPart + 1;
    }
    const codename = `A${String(nextCodeNum).padStart(5, '0')}`;

    // Insert into database
    // Si la tabla antigua está todavía con NOT NULL, usamos 0 como valor provisional.
    const location_lat = data.location_lat ?? 0;
    const location_lng = data.location_lng ?? 0;

    await client.execute({
      sql: `
        INSERT INTO aliens
          (id, codename, type, created_at, created_by, location_lat, location_lng, status)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        codename,
        data.type,
        created_at,
        created_by,
        location_lat,
        location_lng,
        'pending',
      ],
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating alien:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
