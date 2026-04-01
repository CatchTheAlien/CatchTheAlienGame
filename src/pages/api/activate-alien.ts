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

    console.log('activate-alien: request data', data);

    console.log('activate-alien: request body', data);

    if (!data || !data.id || data.location_lat == null || data.location_lng == null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ID y localización son obligatorios',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    if (alien.status === 'found') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Este alien ya fue reclamado',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (alien.status === 'hidden') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Este alien ya está activo',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let imageUrl = null;

    if (data.image_data) {
      if (typeof data.image_data !== 'string' || !data.image_data.startsWith('data:image/')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Formato de imagen no válido',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const base64 = data.image_data.split(',')[1];
      if (!base64) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Datos de imagen no válidos',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const bufferLength = Math.ceil(
        (base64.length * 3) / 4 -
          (data.image_data.endsWith('==') ? 2 : data.image_data.endsWith('=') ? 1 : 0)
      );
      if (bufferLength > 1024 * 1024) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'La imagen no puede superar 1MB',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      imageUrl = data.image_data;
    }

    await client.execute({
      sql: 'UPDATE aliens SET location_lat = ?, location_lng = ?, status = ?, image_url = ? WHERE id = ?',
      args: [data.location_lat, data.location_lng, 'hidden', imageUrl, data.id],
    });

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error activating alien:', error);
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
