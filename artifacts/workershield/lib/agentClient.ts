import { fetch as expoFetch } from "expo/fetch";

export type AgentStatus = "pending" | "running" | "done";

export interface AgentState {
  key: string;
  label: string;
  status: AgentStatus;
  output?: string;
}

export interface RunArgs {
  local: string;
  employer: string;
  role: string;
  caseHistory: string;
  keyPeople: string;
  problem: string;
}

interface Handlers {
  onPending: (key: string, label: string) => void;
  onRunning: (key: string, label: string) => void;
  onDone: (key: string, label: string, output: string) => void;
  onError: (message: string) => void;
  onComplete: () => void;
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

export async function runAgentPipeline(
  args: RunArgs,
  handlers: Handlers,
): Promise<void> {
  const base = getApiBase();
  const url = `${base}/api/agent/run`;

  let response: Response;
  try {
    response = (await expoFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(args),
    })) as unknown as Response;
  } catch (e) {
    handlers.onError(e instanceof Error ? e.message : "Network error");
    return;
  }

  if (!response.ok || !response.body) {
    handlers.onError(`Server error (${response.status})`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let completed = false;
  const wrapped: Handlers = {
    onPending: handlers.onPending,
    onRunning: handlers.onRunning,
    onDone: handlers.onDone,
    onError: (m) => {
      if (completed) return;
      completed = true;
      handlers.onError(m);
    },
    onComplete: () => {
      if (completed) return;
      completed = true;
      handlers.onComplete();
    },
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        processEvent(rawEvent, wrapped);
      }
    }
  } catch (e) {
    wrapped.onError(e instanceof Error ? e.message : "Stream error");
    return;
  }

  wrapped.onComplete();
}

function processEvent(raw: string, handlers: Handlers) {
  const lines = raw.split("\n");
  let event = "message";
  let dataStr = "";
  for (const line of lines) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
  }
  if (!dataStr) return;
  let data: any;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return;
  }
  switch (event) {
    case "agent_pending":
      handlers.onPending(data.key, data.label);
      break;
    case "agent_running":
      handlers.onRunning(data.key, data.label);
      break;
    case "agent_done":
      handlers.onDone(data.key, data.label, data.output ?? "");
      break;
    case "error":
      handlers.onError(data.message ?? "Unknown error");
      break;
    case "complete":
      handlers.onComplete();
      break;
  }
}
