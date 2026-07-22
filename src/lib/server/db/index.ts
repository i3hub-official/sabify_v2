// src/lib/server/db/index.ts
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { DATABASE_URL, DATABASE_URL_UNPOOLED } from '$env/static/private';

const isProd = process.env.NODE_ENV === 'production';
const sslConfig = isProd ? { rejectUnauthorized: true } : undefined;

// ─── Prisma pool ──────────────────────────────────────────────────────────────
const prismaPool = new pg.Pool({
  connectionString: DATABASE_URL_UNPOOLED,
  ...(sslConfig && { ssl: sslConfig }),
  max: 5,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 30_000,
});

prismaPool.on('error', (err) => {
  console.error('[DB:prisma-pool] idle client error:', err.message);
});

const adapter = new PrismaPg(prismaPool);

const globalForPrisma = globalThis as unknown as { prisma?: any };

let prismaPromise: Promise<any> | null = null;

export const prisma = (() => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  if (!prismaPromise) {
    prismaPromise = (async () => {
      const { PrismaClient } = await import('@prisma/client');
      return new PrismaClient({
        adapter,
        log: isProd ? ['error'] : ['warn', 'error'],
      });
    })();
  }

  if (!isProd) {
    prismaPromise.then((client) => {
      globalForPrisma.prisma = client;
    });
  }

  return prismaPromise;
})();

export async function getPrismaClient() {
  return await prisma;
}

// ─── Neon keepalive (prod only) ───────────────────────────────────────────────
if (isProd && typeof setInterval !== 'undefined') {
  setInterval(() => {
    getRawPool()
      .query('SELECT 1')
      .catch((err) => console.warn('[DB:keepalive] ping failed:', err.message));
  }, 4 * 60 * 1000);
}

// ─── Raw pg pool ──────────────────────────────────────────────────────────────
let _rawPool: pg.Pool | null = null;

function getRawPool(): pg.Pool {
  if (_rawPool) return _rawPool;

 _rawPool = new pg.Pool({
  connectionString: DATABASE_URL,
  ...(sslConfig && { ssl: sslConfig }),
  max: 10,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 30_000,
});

  _rawPool.on('error', (err) => {
    console.error('[DB:raw-pool] idle client error:', err.message);
  });

  return _rawPool;
}

// ─── Raw SQL helper ───────────────────────────────────────────────────────────
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await getRawPool().query<T>(text, params);
    const ms = Date.now() - start;
    if (ms > 500) console.warn(`[DB] slow query (${ms}ms):`, text.slice(0, 120));
    return result.rows;
  } catch (err) {
    console.error('[DB] query error:', text.slice(0, 120), err);
    throw err;
  }
}

// ─── Transaction wrapper ──────────────────────────────────────────────────────
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getRawPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch((e) =>
      console.error('[DB] ROLLBACK failed:', e.message)
    );
    throw err;
  } finally {
    client.release();
  }
}