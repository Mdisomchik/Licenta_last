const API_URL = process.env.REACT_APP_AI_API_URL || 'http://localhost:5000';

export async function correctReply(text, tone) {
  const res = await fetch(`${API_URL}/api/correct-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tone }),
  });
  if (!res.ok) throw new Error('Failed to correct reply');
  return res.json();
}

export async function summarize(text) {
  const res = await fetch(`${API_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to summarize');
  return res.json();
}

export async function smartReply(text, tone) {
  const res = await fetch(`${API_URL}/api/smart-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tone }),
  });
  if (!res.ok) throw new Error('Failed to get smart reply');
  return res.json();
}

export async function inlineSuggest(text) {
  const res = await fetch(`${API_URL}/api/inline-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to get inline suggestion');
  return res.json();
} 