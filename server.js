require("dotenv").config();
const express = require("express");

const { analyzeText } = require("./services/aiService");

const pinoHttp = require("pino-http");
const client = require("prom-client");
const app = express();
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const aiRequestsTotal = new client.Counter({
  name: "ai_requests_total",
  help: "Total number of AI analysis requests"
})
const aiRequestsSuccess = new client.Counter({
  name: "ai_requests_success_total",
  help: "Total number of successful AI analysis requests"
});
const aiRequestsFailed = new client.Counter({
  name: "ai_requests_failed_total",
  help: "Total number of failed AI analysis requests"
});
const aiFallbackTotal = new client.Counter({
  name: "ai_fallback_total",
  help: "Total number of requests served using AI fallback"
});
const aiRequestDuration = new client.Histogram({
  name: "ai_request_duration_seconds",
  help: "AI analysis request duration in seconds",
  buckets: [0.5, 1, 2, 5, 10]
});

app.use(express.json());
app.use(pinoHttp());

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.post("/api/v1/analyze", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      message: "Text is required"
    });
  }

  const end = aiRequestDuration.startTimer();
  aiRequestsTotal.inc();

  try {
    const result = await analyzeText(text);
    aiRequestsSuccess.inc();

    res.json({
      text,
      analysis: result
    });
  } catch (error) {
    aiRequestsFailed.inc();
    aiFallbackTotal.inc();

    req.log.error({ err: error }, "AI analysis failed, using fallback");

    res.status(200).json({
      text,
      analysis: {
        category: "other",
        sentiment: "neutral",
        priority: "medium",
        source: "fallback"
      },
      degraded: true
    });
  } finally {
    end();
  }
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Production Lab running on port ${PORT}`);
});