// example_backend/server.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const API_KEY = process.env.RETELL_API_KEY || process.env.API_KEY || "key_a8a85b06333b8514a8c864ba0b88"; // prefer RETELL_API_KEY
const DEFAULT_AGENT_ID = process.env.AGENT_ID || "agent_8d6d93979343a84e1cdce8a15c";

app.get("/health", (_, res) => res.status(200).send("ok"));

app.post("/create-web-call", async (req, res) => {
  try {
    const agent_id = req.body?.agent_id || DEFAULT_AGENT_ID;
    if (!agent_id) {
      return res.status(400).json({ error: "agent_id is required (body.agent_id or env AGENT_ID)" });
    }
    if (!API_KEY) {
      return res.status(500).json({ error: "Server missing RETELL_API_KEY / API_KEY" });
    }

    const r = await axios.post(
      "https://api.retellai.com/v2/create-web-call",
      { agent_id },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    // Prefer sending only what the frontend needs
    const { access_token, web_call_url, call_id, conversation_id } = r.data || {};
    if (access_token || web_call_url) {
      return res.status(r.status).json({ access_token, web_call_url, call_id, conversation_id });
    }

    // Fallback: forward whatever Retell returned
    return res.status(r.status).json(r.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: err.message || "Failed to create web call" };
    console.error("Error from Retell:", status, body);
    return res.status(status).json(body);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
