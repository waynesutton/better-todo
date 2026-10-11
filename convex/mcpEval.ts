// Hand-run check for the smart matching thresholds. Uses made-up phrases only
// (no user data) and the TYPESAFE_API_KEY already set on the deployment:
//   npx convex run mcpEval:run
// Each case prints the pick, its probability, and whether the tool would act.

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { pickCandidate, type MatchCandidate } from "./lib/typesafe";

const TODOS: Array<MatchCandidate> = [
  { id: "t1", text: "Email the landlord about the lease renewal" },
  { id: "t2", text: "Buy groceries for the week" },
  { id: "t3", text: "Call Jamie about the launch video" },
  { id: "t4", text: "Review Convex MCP pull request" },
  { id: "t5", text: "Book dentist appointment" },
  { id: "t6", text: "Pay the electric bill" },
  { id: "t7", text: "Write the blog post draft for Friday" },
  { id: "t8", text: "Call mom" },
];

const PROJECTS: Array<MatchCandidate> = [
  { id: "p1", text: "Launch Week" },
  { id: "p2", text: "Home Reno" },
  { id: "p3", text: "Convex Components" },
  { id: "p4", text: "Personal" },
];

// expected: candidate id the tool should act on, or null when it should ask
const CASES: Array<{
  phrase: string;
  kind: "todo" | "project";
  expected: string | null;
}> = [
  { phrase: "the rent email", kind: "todo", expected: "t1" },
  { phrase: "groceries", kind: "todo", expected: "t2" },
  { phrase: "jamie call", kind: "todo", expected: "t3" },
  { phrase: "that PR review", kind: "todo", expected: "t4" },
  { phrase: "teeth thing", kind: "todo", expected: "t5" },
  { phrase: "power bill", kind: "todo", expected: "t6" },
  { phrase: "friday post", kind: "todo", expected: "t7" },
  { phrase: "call", kind: "todo", expected: null },
  { phrase: "walk the dog", kind: "todo", expected: null },
  { phrase: "the thing", kind: "todo", expected: null },
  { phrase: "phone my mother", kind: "todo", expected: "t8" },
  { phrase: "pay bills", kind: "todo", expected: "t6" },
  { phrase: "launch", kind: "project", expected: "p1" },
  { phrase: "renovation", kind: "project", expected: "p2" },
  { phrase: "components work", kind: "project", expected: "p3" },
  { phrase: "personal stuff", kind: "project", expected: "p4" },
  { phrase: "work", kind: "project", expected: null },
  { phrase: "taxes", kind: "project", expected: null },
];

export const run = internalAction({
  args: {
    todoThreshold: v.optional(v.number()),
    projectThreshold: v.optional(v.number()),
  },
  returns: v.object({ passed: v.number(), total: v.number() }),
  handler: async (_ctx, args) => {
    const todoThreshold = args.todoThreshold ?? 0.85;
    const projectThreshold = args.projectThreshold ?? 0.65;
    let passed = 0;

    for (const c of CASES) {
      const result = await pickCandidate({
        phrase: c.phrase,
        candidates: c.kind === "todo" ? TODOS : PROJECTS,
        minConfidence: c.kind === "todo" ? todoThreshold : projectThreshold,
        kind: c.kind,
      });
      if (!result) {
        console.log(`SKIP  "${c.phrase}": TypeSafe unavailable (check TYPESAFE_API_KEY)`);
        continue;
      }
      const top = result.ranked[0];
      const ok = result.id === c.expected;
      if (ok) passed++;
      console.log(
        `${ok ? "PASS" : "FAIL"}  "${c.phrase}" -> top "${top?.text}" p=${(top?.probability ?? 0).toFixed(2)} acts=${result.id ?? "no"} expected=${c.expected ?? "ask"}`,
      );
    }

    return { passed, total: CASES.length };
  },
});
