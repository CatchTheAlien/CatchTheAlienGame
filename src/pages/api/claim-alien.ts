// src/pages/api/claim-alien.ts
import type { APIRoute } from 'astro';
import { createClient } from '@libsql/client';

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
    if (!data || !data.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ID del alien es obligatorio',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Trim y validar el nombre del reclamador
    const found_by = (data.found_by || '').trim();
    if (!found_by) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'El nombre del reclamador es obligatorio',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if alien exists and is not already claimed
    const alienResult = await client.execute({
      sql: 'SELECT status FROM aliens WHERE id = ?',
      args: [data.id],
    });

    if (alienResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Alien no encontrado',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const alien = alienResult.rows[0];
    if (alien.status !== 'hidden') {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            alien.status === 'found'
              ? 'Este alien ya ha sido reclamado'
              : 'Este alien aún no está activo. Actívalo primero desde el enlace de creador',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Update alien as found
    const found_at = Math.floor(Date.now() / 1000);
    await client.execute({
      sql: 'UPDATE aliens SET status = ?, found_by = ?, found_at = ? WHERE id = ?',
      args: ['found', found_by, found_at, data.id],
    });

    return new Response(
      JSON.stringify({
        success: true,
        found_at: found_at,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error claiming alien:', error);
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
