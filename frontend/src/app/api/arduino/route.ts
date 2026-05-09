/**
 * POST /api/arduino
 *
 * Receives sensor data from Arduino devices and writes to Firestore.
 * This endpoint is **unauthenticated** so Arduino hardware can POST without
 * managing Firebase tokens.
 *
 * Body: { "bin_id": "DEVICE_ID_STRING", "distance": 12.5 }
 *
 * Optional: protect with a shared secret by setting ARDUINO_SECRET env var
 * and having the Arduino send header X-Arduino-Secret: <value>.
 */
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── Firebase Admin (server-side only) ────────────────────────────────────────
function getAdminDb() {
  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey:  (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
        }),
      });
  return getFirestore(app);
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
  const binsRef  = adminDb.collection('bins');
  const snapshot = await binsRef.where('device_id', '==', deviceId).limit(1).get();

  if (snapshot.empty) {
    return NextResponse.json({ success: false, message: 'Device not registered.' }, { status: 404 });
  }

  const binDoc   = snapshot.docs[0];
  const binData  = binDoc.data();
  const binId    = binDoc.id;
  const binHeight = (binData.bin_height as number) ?? 30;
  const status   = calcStatus(distance, binHeight);

  // Write log
  await adminDb.collection('bins').doc(binId).collection('logs').add({
    distance,
    status,
    created_at: FieldValue.serverTimestamp(),
  });

  // Update bin summary
  await adminDb.collection('bins').doc(binId).update({
    status,
    last_distance: distance,
    last_updated:  FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    success:  true,
    message:  'Data received.',
    bin_id:   binId,
    distance,
    status,
  });
}
