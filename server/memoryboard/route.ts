import type { Request, Response } from "express";
import { dailyRun } from "./dailyRun";

/**
 * Wire this into your Express app:
 *   import { memoryboardTask } from "./memoryboard/route";
 *   app.get("/tasks/memoryboard", memoryboardTask);
 * Trigger once daily (1:05am Pacific) from cron-job.org hitting:
 * https://<domain>/tasks/memoryboard?key=<TASK_SECRET>
 *
 * No email service: on any failure the handler returns HTTP 500, so an external
 * monitor (cron-job.org "notify on failure") is the alerting. Success returns
 * 200 with a JSON summary of what was posted.
 */
export async function memoryboardTask(req: Request, res: Response): Promise<void> {
  if ((req.query.key ?? "") !== (process.env.TASK_SECRET ?? "\0")) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const tz = process.env.MB_TIMEZONE || "America/Los_Angeles";
  try {
    const result = await dailyRun(tz);
    // Non-200 if any individual post failed, so the external monitor flags it.
    const status = result.errors.length > 0 ? 500 : 200;
    res.status(status).json({ ok: result.errors.length === 0, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}
