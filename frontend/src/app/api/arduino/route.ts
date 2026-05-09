/**
 * POST /api/arduino
 *
 * Receives sensor data from Arduino devices and writes to Supabase.
 * This endpoint is **unauthenticated** so Arduino hardware can POST.
 *
 * Body: { "bin_id": "DEVICE_ID_STRING", "distance": 12.5 }
 *
 * Optional: protect with a shared secret by setting ARDUINO_SECRET env var
 * and having the Arduino send header X-Arduino-Secret: <value>.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Supabase Admin (server-side only, uses Service Role Key to bypass RLS) ────
function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
type Status = 'Empty' | 'Half-Full' | 'Full';

function calcStatus(distance: number, binHeight: number): Status {
  const pct = binHeight > 0 ? distance / binHeight : 1;
  if (pct > 0.66) return 'Empty';
  if (pct > 0.33) return 'Half-Full';
  return 'Full';
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Optional secret check
  const secret = process.env.ARDUINO_SECRET;
  if (secret && req.headers.get('x-arduino-secret') !== secret) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }

  let body: { bin_id?: unknown; distance?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, message: 'Invalid JSON.' }, { status: 400 }); }

  const deviceId = typeof body.bin_id === 'string' ? body.bin_id.trim() : '';
  const distance = typeof body.distance === 'number' ? body.distance : null;

  if (!deviceId || distance === null) {
    return NextResponse.json({ success: false, message: 'bin_id and distance are required.' }, { status: 422 });
  }
  if (distance < 0 || distance > 9999) {
    return NextResponse.json({ success: false, message: 'Invalid distance value.' }, { status: 422 });
  }

  const adminDb = getAdminDb();

  // Find the bin by device_id
  const { data: bins, error: binError } = await adminDb
    .from('bins')
    .select('id, bin_height')
    .eq('device_id', deviceId)
    .limit(1);

  if (binError || !bins || bins.length === 0) {
    return NextResponse.json({ success: false, message: 'Device not registered.' }, { status: 404 });
  }

  const binData  = bins[0];
  const binId    = binData.id;
  const binHeight = (binData.bin_height as number) ?? 30;
  const status   = calcStatus(distance, binHeight);

  // Write log
  await adminDb.from('bin_logs').insert({
    bin_id: binId,
    distance,
    status,
    created_at: new Date().toISOString(),
  });

  // Update bin summary
  await adminDb.from('bins').update({
    status,
    last_distance: distance,
    last_updated:  new Date().toISOString(),
  }).eq('id', binId);

  return NextResponse.json({
    success:  true,
    message:  'Data received.',
    bin_id:   binId,
    distance,
    status,
  });
}
