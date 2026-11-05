const rateBuckets = new Map();

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: "Cross-origin requests are not allowed." });
      }
    } catch {
      return res.status(403).json({ error: "Invalid request origin." });
    }
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "unknown")).split(",")[0].trim();
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (bucket && now - bucket.startedAt < 60_000 && bucket.count >= 12) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }
  if (!bucket || now - bucket.startedAt >= 60_000) rateBuckets.set(ip, { startedAt: now, count: 1 });
  else bucket.count += 1;

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Please enter a message." });
  if (message.length > 4000) return res.status(413).json({ error: "Message is too long. Limit: 4,000 characters." });

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const endpoint = process.env.AI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  if (!apiKey || !model) {
    return res.status(503).json({
      error: "Live AI is not configured yet. Add AI_API_KEY and AI_MODEL in Vercel Project Settings → Environment Variables, then redeploy."
    });
  }

  let target;
  try {
    target = new URL(endpoint);
    if (target.protocol !== "https:") throw new Error("HTTPS required");
  } catch {
    return res.status(500).json({ error: "AI_BASE_URL must be a valid HTTPS endpoint." });
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: "You are AURELIX Assistant, a clear and practical AI workspace guide. Reply in the language the user uses, including Hinglish when appropriate. Give accurate, structured, actionable help. Never claim to have performed external actions, accessed accounts, or executed workflows unless the system explicitly confirms it."
          },
          { role: "user", content: message }
        ]
      }),
      signal: AbortSignal.timeout(25_000)
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const safeMessage = upstream.status === 401 || upstream.status === 403
        ? "The configured AI provider rejected the API key. Check the Vercel environment variable."
        : upstream.status === 429
          ? "The AI provider rate limit was reached. Please try again shortly."
          : "The AI provider request failed. Check the provider settings and try again.";
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: safeMessage });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: "The AI provider returned an empty or unsupported response." });
    }
    return res.status(200).json({ answer: answer.trim(), model });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return res.status(502).json({ error: timedOut ? "The AI request timed out. Please try again." : "Could not reach the AI provider. Please try again." });
  }
};
