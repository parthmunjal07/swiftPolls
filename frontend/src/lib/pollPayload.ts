/** Maps poll builder / edit form fields to POST /api/polls body (backend createPollSchema). */

export type PollFormQuestion = {
  title?: string;
  is_mandatory?: boolean;
  settings?: { show_results_live?: boolean; time_limit?: number | null };
  options: Array<{ text?: string }>;
};

export type PollFormForCreate = {
  title: string;
  description?: string;
  mode: "live" | "async";
  /** When true, async respondents may answer without signing in (session token / guest). */
  is_anonymous?: boolean;
  expiresAt?: string | null;
  questions: PollFormQuestion[];
};

function toIsoExpires(expiresAt: string | null | undefined): string | undefined {
  if (expiresAt == null || String(expiresAt).trim() === "") return undefined;
  const d = new Date(expiresAt as string);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function normalizeTimeLimitSecs(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  const floored = Math.floor(n);
  if (floored < 5 || floored > 300) return null;
  return floored;
}

export function formToCreatePollPayload(data: PollFormForCreate, opts: { draft: boolean }) {
  const draft = opts.draft;

  const questions = data.questions.map((q, qi) => {
    const body = (q.title ?? "").trim() || (draft ? `Question ${qi + 1}` : "");
    const opts = (q.options ?? []).map((o, oi) => ({
      text: (o.text ?? "").trim() || (draft ? `Option ${oi + 1}` : ""),
      display_order: oi,
    }));

    const options =
      draft && opts.length < 2
        ? [
            ...opts,
            ...Array.from({ length: 2 - opts.length }, (_, k) => ({
              text: `Option ${opts.length + k + 1}`,
              display_order: opts.length + k,
            })),
          ]
        : opts;

    return {
      body,
      is_mandatory: q.is_mandatory ?? true,
      display_order: qi,
      options,
      settings: {
        show_results_live: q.settings?.show_results_live ?? false,
        time_limit_secs: normalizeTimeLimitSecs(q.settings?.time_limit),
      },
    };
  });

  let questionsOut = questions;
  if (draft && questionsOut.length === 0) {
    questionsOut = [
      {
        body: "Question 1",
        is_mandatory: true,
        display_order: 0,
        options: [
          { text: "Option 1", display_order: 0 },
          { text: "Option 2", display_order: 1 },
        ],
        settings: { show_results_live: false, time_limit_secs: null },
      },
    ];
  }

  const titleTrim = (data.title ?? "").trim();
  const title =
    draft && !titleTrim ? "Untitled poll" : titleTrim;

  const payload: Record<string, unknown> = {
    title,
    description: (data.description ?? "").trim() || undefined,
    mode: data.mode,
    is_anonymous: data.is_anonymous ?? false,
    draft,
    questions: questionsOut,
  };

  const exp = toIsoExpires(data.expiresAt);
  if (exp && data.mode === "async") {
    payload.expires_at = exp;
  }

  return payload;
}
