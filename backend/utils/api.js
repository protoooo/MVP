const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function createSession(payload) {
  const res = await fetch(`${API_BASE}/createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_USER_API_KEY}` },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function uploadMedia(session_id, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/uploadMedia`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_USER_API_KEY}` },
    body: formData
  });
  return res.json();
}

export async function processSession(session_id) {
  const res = await fetch(`${API_BASE}/processSession/${session_id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_USER_API_KEY}` }
  });
  return res.json();
}

export async function getReport(session_id) {
  const res = await fetch(`${API_BASE}/getReport/${session_id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_USER_API_KEY}` }
  });
  return res.json();
}
