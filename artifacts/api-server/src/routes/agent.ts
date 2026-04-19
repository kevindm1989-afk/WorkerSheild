import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import {
  AGENT_LABELS,
  AGENT_PROMPTS,
  JURISPRUDENCE_DB,
  SPECIALIST_KEYS,
  buildContextBlock,
  parseSpecialists,
  type AgentKey,
} from "../lib/agents";

const JURISPRUDENCE_AGENTS = new Set<AgentKey>(["arbitration", "cba", "qc"]);

const router: IRouter = Router();

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 3000;
const TEMPERATURE = 0.2;

function getClient(): Anthropic {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey });
}

interface RunBody {
  local?: string;
  employer?: string;
  role?: string;
  caseHistory?: string;
  keyPeople?: string;
  problem?: string;
}

async function callAgent(
  client: Anthropic,
  agentKey: AgentKey,
  contextBlock: string,
  userPayload: string,
  signal: AbortSignal,
): Promise<string> {
  const system = `${AGENT_PROMPTS[agentKey]}\n\n--- WORKPLACE CONTEXT ---\n${contextBlock}`;
  const finalPayload = JURISPRUDENCE_AGENTS.has(agentKey)
    ? `${userPayload}\n\nVERIFIED JURISPRUDENCE DATABASE:\n${JURISPRUDENCE_DB}`
    : userPayload;
  const message = await client.messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system,
      messages: [{ role: "user", content: finalPayload }],
    },
    { signal },
  );
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}

class ClientDisconnectedError extends Error {
  constructor() {
    super("client_disconnected");
  }
}

function sse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const agentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Rate limit exceeded. Please try again in an hour.",
  },
});

router.post("/agent/run", agentLimiter, async (req: Request, res: Response) => {
  const body = req.body as RunBody;
  const local = (body.local ?? "").trim();
  const employer = (body.employer ?? "").trim();
  const role = (body.role ?? "Both Roles").trim();
  const problem = (body.problem ?? "").trim();
  const caseHistory = body.caseHistory ?? "";
  const keyPeople = body.keyPeople ?? "";

  if (!problem) {
    res.status(400).json({ error: "problem is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const abortController = new AbortController();
  let clientClosed = false;

  const heartbeat = setInterval(() => {
    if (!clientClosed) res.write(": ping\n\n");
  }, 15000);

  const cleanup = () => {
    clearInterval(heartbeat);
  };
  const checkOpen = () => {
    if (clientClosed) throw new ClientDisconnectedError();
  };
  req.on("close", () => {
    clientClosed = true;
    abortController.abort();
    cleanup();
  });

  try {
    const client = getClient();
    const contextBlock = buildContextBlock({
      local,
      employer,
      role,
      caseHistory,
      keyPeople,
    });

    const problemPayload = `WORKPLACE PROBLEM SUBMITTED BY ${role.toUpperCase()}:\n\n${problem}`;

    const outputs: Partial<Record<AgentKey, string>> = {};

    sse(res, "agent_pending", { key: "intake", label: AGENT_LABELS.intake });

    // 1) INTAKE
    checkOpen();
    sse(res, "agent_running", { key: "intake", label: AGENT_LABELS.intake });
    const intakeOut = await callAgent(
      client,
      "intake",
      contextBlock,
      problemPayload,
      abortController.signal,
    );
    outputs.intake = intakeOut;
    if (clientClosed) throw new ClientDisconnectedError();
    sse(res, "agent_done", {
      key: "intake",
      label: AGENT_LABELS.intake,
      output: intakeOut,
    });

    // 2) Determine specialists
    const specialists = parseSpecialists(intakeOut);

    for (const k of specialists) {
      sse(res, "agent_pending", { key: k, label: AGENT_LABELS[k] });
    }
    sse(res, "agent_pending", { key: "qc", label: AGENT_LABELS.qc });
    sse(res, "agent_pending", { key: "final", label: AGENT_LABELS.final });

    // 3) Run specialists in parallel — isolated failures
    checkOpen();
    const settled = await Promise.allSettled(
      specialists.map(async (k) => {
        if (clientClosed) throw new ClientDisconnectedError();
        sse(res, "agent_running", { key: k, label: AGENT_LABELS[k] });
        const payload = `WORKPLACE PROBLEM:\n${problem}\n\n--- INTAKE AGENT ANALYSIS ---\n${intakeOut}`;
        const out = await callAgent(
          client,
          k,
          contextBlock,
          payload,
          abortController.signal,
        );
        return [k, out] as const;
      }),
    );
    if (clientClosed) throw new ClientDisconnectedError();
    for (let i = 0; i < settled.length; i++) {
      const k = specialists[i]!;
      const r = settled[i]!;
      if (r.status === "fulfilled") {
        const [, out] = r.value;
        outputs[k] = out;
        sse(res, "agent_done", { key: k, label: AGENT_LABELS[k], output: out });
      } else {
        const errMsg = r.reason instanceof Error ? r.reason.message : "Agent failed";
        const placeholder = `_(This specialist could not be reached: ${errMsg})_`;
        outputs[k] = placeholder;
        sse(res, "agent_done", {
          key: k,
          label: AGENT_LABELS[k],
          output: placeholder,
        });
      }
    }

    // 4) QC
    checkOpen();
    sse(res, "agent_running", { key: "qc", label: AGENT_LABELS.qc });
    const previousBlock = buildPreviousOutputsBlock(outputs);
    const qcPayload = `WORKPLACE PROBLEM:\n${problem}\n\n--- ALL AGENT OUTPUTS TO REVIEW ---\n${previousBlock}`;
    const qcOut = await callAgent(
      client,
      "qc",
      contextBlock,
      qcPayload,
      abortController.signal,
    );
    outputs.qc = qcOut;
    if (clientClosed) throw new ClientDisconnectedError();
    sse(res, "agent_done", { key: "qc", label: AGENT_LABELS.qc, output: qcOut });

    // 5) FINAL
    checkOpen();
    sse(res, "agent_running", { key: "final", label: AGENT_LABELS.final });
    const finalPayload = `WORKPLACE PROBLEM:\n${problem}\n\n--- INTAKE ANALYSIS ---\n${intakeOut}\n\n--- SPECIALIST OUTPUTS ---\n${previousBlock}\n\n--- QC REVIEW ---\n${qcOut}\n\nNow compile the final WorkerShield response.`;
    const finalOut = await callAgent(
      client,
      "final",
      contextBlock,
      finalPayload,
      abortController.signal,
    );
    outputs.final = finalOut;
    if (clientClosed) throw new ClientDisconnectedError();
    sse(res, "agent_done", {
      key: "final",
      label: AGENT_LABELS.final,
      output: finalOut,
    });

    sse(res, "complete", { ok: true });
  } catch (err) {
    if (err instanceof ClientDisconnectedError || clientClosed) {
      req.log?.info("agent pipeline aborted: client disconnected");
    } else {
      const message = err instanceof Error ? err.message : "Unknown error";
      req.log?.error({ err }, "agent pipeline failed");
      try {
        sse(res, "error", { message });
      } catch {
        /* socket closed */
      }
    }
  } finally {
    cleanup();
    if (!clientClosed) {
      try {
        res.end();
      } catch {
        /* already ended */
      }
    }
  }
});

function buildPreviousOutputsBlock(
  outputs: Partial<Record<AgentKey, string>>,
): string {
  const order: AgentKey[] = ["intake", ...SPECIALIST_KEYS, "qc"];
  const parts: string[] = [];
  for (const k of order) {
    const out = outputs[k];
    if (out) {
      parts.push(`### ${AGENT_LABELS[k]}\n${out}`);
    }
  }
  return parts.join("\n\n");
}

export default router;
