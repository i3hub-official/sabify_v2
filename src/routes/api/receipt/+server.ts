// src/routes/api/receipt/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as cheerio from 'cheerio';
import { parseReceiptHtml, maskValue } from '$lib/universities/receipt';

// ─── Shared fetch helper ──────────────────────────────────────────
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(10_000),
  });
  const html = await res.text();
  if (html.trimStart().startsWith('{')) {
    const parsed = JSON.parse(html);
    throw new Error(parsed.message ?? 'Invalid reference');
  }
  return html;
}

// ─── Handler ──────────────────────────────────────────────────────
// POST /api/receipt
// Body: { university: 'MOUAU' | 'ABSU' | 'ESUT', ref: string }
export const POST: RequestHandler = async ({ request }) => {
  let body: { university?: string; ref?: string };

  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const university = body.university?.trim().toUpperCase();
  const ref        = body.ref?.trim();

  if (!university) return json({ success: false, error: 'Missing university.' }, { status: 400 });
  if (!ref)        return json({ success: false, error: 'Missing ref.' },        { status: 400 });

  try {
    switch (university) {

      // ── MOUAU ─────────────────────────────────────────────────
      case 'MOUAU': {
        const html = await fetchHtml(
          `https://apis.backend.mouau.edu.ng/api/printable-receipt?transaction_ref=${encodeURIComponent(ref)}`
        );
        const map = parseReceiptHtml(html);
        const get = (k: string) => map[k.toLowerCase()] ?? '';

        if (!get('name') && !get('matric no')) {
          return json({ success: false, error: 'Could not parse receipt.' }, { status: 422 });
        }

        const data = {
          name:       get('name'),
          college:    get('college'),
          department: get('department'),
          matricNo:   get('matric no'),
          jambregNo:  get('reg. no'),
          level:      get('level'),
          session:    get('session'),
          receiptNo:  get('portal issued receipt number'),
          rrrCode:    get('rrr code'),
        };

        return json({
          success: true,
          data: {
            ...data,
            preview: {
              Name:         data.name,
              College:      data.college,
              Department:   data.department,
              'Matric No':  data.matricNo,
              'JAMB Reg':   maskValue(data.jambregNo, 4, 3),
              'Receipt No': maskValue(data.receiptNo, 2, 2),
            },
          },
        });
      }

      // ── ABSU ──────────────────────────────────────────────────
      case 'ABSU': {
        const html = await fetchHtml(
          `https://portal.abiastateuniversity.edu.ng/Applicant/Admission/Receipt?pmid=${encodeURIComponent(ref)}`
        );
        const $ = cheerio.load(html);
        const map: Record<string, string> = {};

        $('p.text-xs').each((_, el) => {
          const label = $(el).text().trim().toLowerCase();
          const value = $(el).next('p').text().trim();
          if (label && value) map[label] = value;
        });

        const get      = (k: string) => map[k.toLowerCase()] ?? '';
        const name     = get('name');
        const matricNo = get('matric number');

        if (!name && !matricNo) {
          return json({ success: false, error: 'Could not parse ABSU receipt.' }, { status: 422 });
        }

        const data = {
          name,
          matricNo,
          faculty:    get('faculty'),
          department: get('department'),
          receiptNo:  get('receipt no'),
          session:    get('session'),
          level:      get('level'),
        };

        return json({
          success: true,
          data: {
            ...data,
            preview: {
              Name:         data.name,
              Faculty:      data.faculty,
              Department:   data.department,
              'Matric No':  data.matricNo,
              'Receipt No': maskValue(data.receiptNo, 3, 4),
            },
          },
        });
      }

      // ── ESUT ──────────────────────────────────────────────────
      case 'ESUT': {
        const res = await fetch(`https://esutid.com/validate/${encodeURIComponent(ref)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept:       'text/html',
            Referer:      'https://esutid.com/',
          },
          signal: AbortSignal.timeout(10_000),
        });

        if (res.status === 403) {
          return json(
            { success: false, error: 'ESUT portal denied access. Please enter details manually.' },
            { status: 502 }
          );
        }

        const html = await res.text();
        const $    = cheerio.load(html);
        const map: Record<string, string> = {};

        $('p.text-xs.text-gray-500').each((_, el) => {
          const label = $(el).text().trim().toLowerCase();
          const value = $(el).next('p').text().trim();
          if (label && value) map[label] = value;
        });

        const get    = (k: string) => map[k.toLowerCase()] ?? '';
        const name   = get('full name');
        const matric = get('matric number');

        if (!name && !matric) {
          return json({ success: false, error: 'Could not parse ESUT receipt.' }, { status: 422 });
        }

        const paymentStatus = get('payment status').toLowerCase();
        if (paymentStatus && !paymentStatus.includes('success')) {
          return json(
            { success: false, error: `Payment status is "${get('payment status')}". Only successful payments are accepted.` },
            { status: 422 }
          );
        }

        const data = {
          name,
          matricNo:   matric,
          faculty:    get('faculty'),
          department: get('department'),
          receiptNo:  get('payment reference'),
          session:    '',
          level:      '',
        };

        return json({
          success: true,
          data: {
            ...data,
            preview: {
              Name:         data.name,
              Faculty:      data.faculty,
              Department:   data.department,
              'Matric No':  data.matricNo,
              'Receipt No': maskValue(data.receiptNo, 7, 4),
            },
          },
        });
      }

      default:
        return json({ success: false, error: `Unsupported university: ${university}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: message }, { status: 502 });
  }
};