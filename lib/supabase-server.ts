export const VEHICLE_PHOTOS_BUCKET = "vehicle-photos";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para usar fotos.");
  return { url, key };
}

export async function uploadVehiclePhoto(path: string, file: File) {
  const { url, key } = config();
  const response = await fetch(`${url}/storage/v1/object/${VEHICLE_PHOTOS_BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": file.type, "x-upsert": "false" },
    body: await file.arrayBuffer(),
  });
  if (!response.ok) throw new Error(`Falha no upload: ${response.status} ${await response.text()}`);
  return path;
}

export async function downloadVehiclePhoto(path: string) {
  const { url, key } = config();
  const response = await fetch(`${url}/storage/v1/object/authenticated/${VEHICLE_PHOTOS_BUCKET}/${path}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  });
  return response;
}
