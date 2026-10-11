// Smart matching with TypeSafe (https://docs.typesafe.ai).
// Code finds candidates through indexes first; TypeSafe only picks one of them.
// Runs in the default runtime (plain fetch). Without TYPESAFE_API_KEY, or on
// any error or timeout, it returns null and callers fall back to plain rules.

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 3000;
const NONE = "none_of_these";
// TypeSafe allows at most 255 options per Choice; keep requests small anyway
const MAX_CANDIDATES = 50;

export type MatchCandidate = {
  id: string;
  text: string;
  date?: string;
  project?: string;
};

export type RankedCandidate = MatchCandidate & { probability: number };

export type PickResult = {
  // Chosen id when the top pick clears minConfidence, otherwise null
  id: string | null;
  // Probability of the top option (0 when none_of_these wins)
  confidence: number;
  // Candidates sorted by probability, highest first
  ranked: Array<RankedCandidate>;
};

type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export function isTypesafeEnabled(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

// Ask TypeSafe which candidate the phrase refers to. Option keys are short
// positional labels (c0, c1, ...) so record ids never leave Convex.
export async function pickCandidate(args: {
  phrase: string;
  candidates: Array<MatchCandidate>;
  minConfidence: number;
  kind: "todo" | "note" | "project";
}): Promise<PickResult | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  const candidates = args.candidates.slice(0, MAX_CANDIDATES);
  if (!apiKey || candidates.length === 0) {
    return null;
  }

  const criteria: Record<string, string> = {};
  candidates.forEach((candidate, index) => {
    const extras = [
      candidate.date ? `date ${candidate.date}` : null,
      candidate.project ? `project ${candidate.project}` : null,
    ].filter(Boolean);
    criteria[`c${index}`] =
      candidate.text.slice(0, 300) +
      (extras.length > 0 ? ` (${extras.join(", ")})` : "");
  });
  criteria[NONE] = `The request does not clearly refer to any listed ${args.kind}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jev-latest",
        state: { request: args.phrase.slice(0, 500) },
        questions: {
          target: {
            type: "choice",
            instructions: `A user asked their assistant about one of their ${args.kind}s using the words in \`request\`. Which ${args.kind} do they mean?`,
            criteria,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`TypeSafe match failed with status ${response.status}`);
      return null;
    }

    const body = (await response.json()) as {
      answers?: { target?: ChoiceAnswer };
    };
    const answer = body.answers?.target;
    if (!answer || answer.type !== "choice") {
      return null;
    }

    const ranked: Array<RankedCandidate> = candidates
      .map((candidate, index) => ({
        ...candidate,
        probability: answer.probabilities[`c${index}`] ?? 0,
      }))
      .sort((a, b) => b.probability - a.probability);

    if (answer.choice === NONE) {
      return { id: null, confidence: 0, ranked };
    }

    const top = ranked[0];
    const confidence = top?.probability ?? 0;
    return {
      id: top && confidence >= args.minConfidence ? top.id : null,
      confidence,
      ranked,
    };
  } catch (error) {
    // Timeouts and network errors fall back to deterministic matching
    console.warn(
      "TypeSafe match unavailable:",
      error instanceof Error ? error.name : "unknown error",
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Deterministic matching used first and as the fallback: exact
// (case-insensitive) match, then a single substring match.
export function matchInCode(
  phrase: string,
  candidates: Array<MatchCandidate>,
): { id: string | null; exactTies: Array<MatchCandidate> } {
  const needle = normalize(phrase);
  if (!needle) {
    return { id: null, exactTies: [] };
  }

  const exact = candidates.filter((c) => normalize(c.text) === needle);
  if (exact.length === 1) {
    return { id: exact[0].id, exactTies: [] };
  }
  if (exact.length > 1) {
    return { id: null, exactTies: exact };
  }

  const contains = candidates.filter((c) => normalize(c.text).includes(needle));
  if (contains.length === 1) {
    return { id: contains[0].id, exactTies: [] };
  }
  return { id: null, exactTies: [] };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`#~[\]()>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
