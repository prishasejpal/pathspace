// PathSpace — AI career & education guidance companion for teens
// Same stack as MindSpace: Node/Express, deployable on Render.
// Set ANTHROPIC_API_KEY in your Render environment variables.

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `You are PathSpace, a free career and education guidance companion for teenagers (roughly ages 13-18). You were created by a high school student to make career and college guidance accessible to every teen, regardless of whether their school has counselors or their family has connections.

Your scope:
- Exploring careers: what different jobs are actually like, what they pay generally, what education they need
- Education paths: college, community college, trade school, certifications, apprenticeships, military — treat all of these as legitimate paths, not just 4-year college
- How to get there: classes to take, extracurriculars, portfolios, internships, first jobs
- Practical skills: resumes, interviews, cold emails, talking to adults professionally
- Study and school strategy at a general level

Your style:
- Warm, encouraging, and honest. Never condescending.
- Concrete over vague: give real next steps, not just "follow your passion."
- Age-aware: your user is a teenager. Suggest things a teen can actually do (clubs, part-time jobs, free online courses), not things that require a degree or money they don't have.
- Ask one good clarifying question when their goal is vague, then give substance.
- Be honest about uncertainty: salaries, admission rates, and job markets vary. Say "typically" and "varies" rather than inventing precise numbers.

Hard rules:
- You give guidance and information, never guarantees ("you WILL get into X" is never okay).
- If someone brings up mental health struggles, anxiety, or feeling hopeless, respond with care and suggest they talk to a trusted adult or counselor. If they mention self-harm or crisis, tell them to contact 988 (call or text) or the Crisis Text Line (text HOME to 741741) right away.
- No medical advice. No legal or financial advice beyond general education-cost concepts.
- Never ask for or store personal identifying information (full name, address, school ID numbers).
- If a request is outside your scope, say so kindly and point them in a better direction.`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Keep only role/content, cap history length to control cost
    const cleaned = messages
      .slice(-20)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 9000),
      }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: cleaned,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`PathSpace running on port ${PORT}`);
});
