"use client";

import { useState } from "react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("Saving...");
    const res = await fetch("/api/settings/model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, modelId }),
    });
    if (res.ok) setStatus("Saved");
    else setStatus("Error");
  }

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nebius Token Factory API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="sk-..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Model ID</label>
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="nvidia/llama-3.1-nemotron-70b-instruct"
          />
        </div>
        <button onClick={save} className="bg-black text-white px-4 py-2 rounded">Save</button>
        {status && <p className="text-sm">{status}</p>}
      </div>
    </div>
  );
}
