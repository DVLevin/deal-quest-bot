// InsForge Edge Function: generate-draft
// Receives a screenshot URL + lead context, fetches the image,
// calls OpenRouter vision API with the comment_generator prompt,
// and returns generated comment options.
// Runtime: Deno.

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// System prompt inlined from prompts/comment_generator.md
// (Edge Functions can't access repo filesystem at runtime)
const COMMENT_GENERATOR_PROMPT = `# Comment Generator — System Prompt

You are a LinkedIn engagement specialist at GetDeal.ai. The user will send you a screenshot of a prospect's LinkedIn post and you need to generate a thoughtful, engaging comment.

## Input

You will receive:
1. **Screenshot** — image of a LinkedIn post or content
2. **Lead Context** — prospect name, title, company, relationship status
3. **Web Research** — background on the prospect (if available)

## Your Job

Generate a comment that:
1. Shows genuine engagement with the content
2. Adds value (insight, relevant experience, or thoughtful question)
3. Subtly positions the user as a knowledgeable peer
4. Does NOT sell or pitch anything
5. Feels natural, not AI-generated

## Output Format

Provide 2-3 comment options, from shorter to longer:

**Option 1 (Short — 1-2 sentences):**
[comment]

**Option 2 (Medium — 2-3 sentences):**
[comment]

**Option 3 (Detailed — 3-4 sentences):**
[comment]

## Rules

1. **Match the tone** of the original post (casual vs professional)
2. **Never use** cliches like "Great post!" or "Couldn't agree more!"
3. **Reference specifics** from the post content
4. **Add unique perspective** — share a relevant data point, experience, or question
5. **Keep it authentic** — read like a real person, not a bot
6. If the post discusses industry trends, tie it to M&A or deal-making naturally
7. Use plain text only, no markdown`;

module.exports = async function (request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!OPENROUTER_API_KEY) {
      console.error("[generate-draft] OPENROUTER_API_KEY not set");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const { proofUrl, leadName, leadTitle, leadCompany, leadStatus, webResearch } =
      await request.json();

    if (!proofUrl) {
      return jsonResponse({ error: "Missing proofUrl" }, 400);
    }

    // 1. Fetch the image and convert to base64
    const imageResponse = await fetch(proofUrl);
    if (!imageResponse.ok) {
      return jsonResponse(
        { error: `Failed to fetch image: ${imageResponse.status}` },
        400,
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer)),
    );

    // Detect content type from response or default to jpeg
    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    // 2. Build lead context string
    const contextParts = [];
    if (leadName) contextParts.push(`Name: ${leadName}`);
    if (leadTitle) contextParts.push(`Title: ${leadTitle}`);
    if (leadCompany) contextParts.push(`Company: ${leadCompany}`);
    if (leadStatus) contextParts.push(`Relationship status: ${leadStatus}`);
    const leadContext =
      contextParts.length > 0
        ? contextParts.join("\n")
        : "No additional context available";

    const userMessage = `Here is the screenshot of the prospect's LinkedIn post/content. Please analyze it and generate comment options.

**Lead Context:**
${leadContext}${webResearch ? `\n\n**Web Research:**\n${webResearch}` : ""}`;

    // 3. Call OpenRouter vision API
    const openrouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://getdeal.ai",
          "X-Title": "Deal Quest TMA",
        },
        body: JSON.stringify({
          model: "moonshotai/kimi-k2.5",
          messages: [
            {
              role: "system",
              content: COMMENT_GENERATOR_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userMessage,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${contentType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      },
    );

    if (!openrouterResponse.ok) {
      const errText = await openrouterResponse.text();
      console.error("[generate-draft] OpenRouter error:", errText);
      return jsonResponse(
        { error: `AI service error: ${openrouterResponse.status}` },
        502,
      );
    }

    const result = await openrouterResponse.json();
    const draft = result.choices?.[0]?.message?.content;

    if (!draft) {
      return jsonResponse({ error: "No response from AI" }, 502);
    }

    return jsonResponse({ draft }, 200);
  } catch (err) {
    console.error("[generate-draft] Unexpected error:", err);
    return jsonResponse(
      { error: "Internal server error: " + err.message },
      500,
    );
  }
};
