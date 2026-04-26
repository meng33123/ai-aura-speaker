const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const ALLOWED_MOODS = new Set([
  "joy",
  "passion",
  "calm",
  "melancholy",
  "energetic",
  "neutral",
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseJSONSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractObject(text) {
  const direct = parseJSONSafe(text);
  if (direct && typeof direct === "object") return direct;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return parseJSONSafe(match[0]);
}

export default async (req) => {
  if (req.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (req.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing DEEPSEEK_API_KEY" }),
    };
  }

  const body = parseJSONSafe(req.body || "");
  if (!body || typeof body !== "object") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const text = typeof body.text === "string" ? body.text : "";
  const tempoInput = typeof body.tempo === "number" ? body.tempo : 108;
  const tempo = clamp(Math.round(tempoInput), 60, 200);
  const beatIndex = Array.isArray(body.beat_index)
    ? body.beat_index.filter((n) => typeof n === "number").slice(0, 64)
    : [0.5, 1.0, 1.5];
  const intensity = Array.isArray(body.intensity)
    ? body.intensity
        .filter((n) => typeof n === "number")
        .map((n) => clamp(n, 0, 1))
        .slice(0, 64)
    : [0.3, 0.6, 0.85];

  const prompt = `
你是音乐情绪分析器。根据输入文本和节奏，输出严格 JSON（不要 markdown）:
{
  "mood": "joy|passion|calm|melancholy|energetic|neutral",
  "key_mode": "major|minor|unknown",
  "primary_hue": 0-359 number,
  "secondary_hue": 0-359 number,
  "palette_hues": [0-359 number, 0-359 number, 0-359 number],
  "saturation_hint": 0.2-1 number,
  "dynamic_bias": 0-1 number
}
输入:
- text: ${JSON.stringify(text)}
- tempo: ${tempo}
`;

  try {
    const dsRes = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          { role: "system", content: "Return valid compact JSON only." },
          { role: "user", content: prompt.trim() },
        ],
      }),
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "DeepSeek request failed", detail: errText }),
      };
    }

    const completion = await dsRes.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "DeepSeek response format invalid" }),
      };
    }

    const parsed = extractObject(content);
    const mood = typeof parsed?.mood === "string" ? parsed.mood : "neutral";
    const keyMode =
      parsed?.key_mode === "major" || parsed?.key_mode === "minor"
        ? parsed.key_mode
        : "unknown";
    const primaryHue = clamp(Number(parsed?.primary_hue ?? 210), 0, 359);
    const secondaryHue = clamp(Number(parsed?.secondary_hue ?? 280), 0, 359);
    const paletteHues = Array.isArray(parsed?.palette_hues)
      ? parsed.palette_hues
          .filter((n) => typeof n === "number")
          .map((n) => clamp(Number(n), 0, 359))
          .slice(0, 4)
      : [primaryHue, secondaryHue, (primaryHue + 36) % 360];
    const saturationHint = clamp(Number(parsed?.saturation_hint ?? 0.68), 0.2, 1);
    const dynamicBias = clamp(Number(parsed?.dynamic_bias ?? 0.55), 0, 1);

    const payload = {
      mood: ALLOWED_MOODS.has(mood) ? mood : "neutral",
      key_mode: keyMode,
      primary_hue: primaryHue,
      secondary_hue: secondaryHue,
      palette_hues: paletteHues,
      saturation_hint: saturationHint,
      dynamic_bias: dynamicBias,
      tempo,
      beat_index: beatIndex,
      intensity,
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Analyze function failed",
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
