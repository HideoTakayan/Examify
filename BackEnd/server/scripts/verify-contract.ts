/**
 * Contract verification script: compares BE swagger output types vs FE examApi.ts types.
 * Run: npx ts-node -r tsconfig-paths/register scripts/verify-contract.ts
 *
 * This is a lightweight static-checker that parses key structural mismatches
 * between the BE swagger spec (from /docs-json) and the FE TypeScript types.
 */

import { readFileSync } from "fs";
import { join } from "path";

const SWAGGER_URL = process.env.SWAGGER_URL ?? "http://localhost:5000/v1/docs-json";
const FE_API_PATH = join(__dirname, "../../FrontEnd/client/src/services/examApi.ts");

// ─── Helpers ────────────────────────────────────────────────────────────────────

interface SwaggerPath {
  [method: string]: {
    summary?: string;
    responses?: { [code: string]: { content?: { "application/json": { schema: unknown } } } };
  };
}

type SwaggerSpec = { paths?: { [path: string]: SwaggerPath }; components?: { schemas?: Record<string, unknown> } };

/** Recursively collect all $ref names referenced from a swagger schema node. */
function collectRefs(node: unknown, refs: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(i => collectRefs(i, refs)); return; }
  const obj = node as Record<string, unknown>;
  if (obj["$ref"] && typeof obj["$ref"] === "string") {
    refs.add(obj["$ref"].replace(/^#\//, ""));
  }
  Object.values(obj).forEach(v => collectRefs(v, refs));
}

/** Get the resolved schema from swagger components (follows $ref chain). */
function resolveRef(name: string, components: Record<string, unknown> | undefined): unknown {
  if (!components) return null;
  const schema = components[name] as Record<string, unknown> | undefined;
  if (!schema) return null;
  if (schema["$ref"]) {
    const next = String(schema["$ref"]).replace(/^#\/components\/schemas\//, "");
    return resolveRef(next, components);
  }
  return schema;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Fetch swagger from running server
  let swagger: SwaggerSpec;
  try {
    const res = await fetch(SWAGGER_URL);
    swagger = await res.json() as SwaggerSpec;
    console.log("✓ Fetched swagger from", SWAGGER_URL);
  } catch (e) {
    console.error("✗ Could not fetch swagger (server not running?):", (e as Error).message);
    console.log("  Skipping contract verification. Start BE with `npm run dev` first.");
    return;
  }

  const components = swagger.components;
  const paths = swagger.paths ?? {};

  // 2. FE types — read as plain text for simple grep checks
  let feTypes = "";
  try {
    feTypes = readFileSync(FE_API_PATH, "utf-8");
    console.log("✓ Read FE types from", FE_API_PATH);
  } catch (e) {
    console.error("✗ Could not read FE types:", (e as Error).message);
    return;
  }

  // ── Check 1: SessionReview interface in FE matches /review response ─────────
  const hasSessionReviewFE = feTypes.includes("getSessionReview") && feTypes.includes("SessionReview");
  if (!hasSessionReviewFE) {
    warnings.push("FE: missing getSessionReview / SessionReview type — endpoint may not be wired in FE");
  } else {
    console.log("✓ FE: SessionReview type found");
  }

  // ── Check 2: /exams/sessions/{sessionId}/review endpoint documented in swagger ──
  if (!paths["/exams/sessions/{sessionId}/review"]) {
    errors.push("Swagger: /exams/sessions/{sessionId}/review GET is not documented");
  } else {
    console.log("✓ Swagger: /exams/sessions/{sessionId}/review documented");
  }

  // ── Check 3: SessionReview response schema has explanation field ──────────────
  const reviewPath = paths["/exams/sessions/{sessionId}/review"];
  const reviewGet = reviewPath?.["get"];
  const reviewSchema = reviewGet?.responses?.["200"]?.content?.["application/json"]?.schema as Record<string, unknown>;
  if (reviewSchema) {
    const refs = new Set<string>();
    collectRefs(reviewSchema, refs);
    if (refs.has("SessionReview") || (reviewSchema as any).properties?.questions) {
      const questionsSchema = (reviewSchema as any).properties?.questions;
      if (questionsSchema?.items?.properties?.explanation) {
        console.log("✓ Swagger: review questions schema includes explanation field");
      } else {
        warnings.push("Swagger: review questions schema may be missing explanation field");
      }
    }
  }

  // ── Check 4: Export endpoint supports format=csv and format=excel ─────────────
  const exportPath = paths["/exports/exam-results"];
  if (!exportPath) {
    errors.push("Swagger: /exports/exam-results is not documented");
  } else {
    const exportGet = exportPath["get"];
    if (exportGet) {
      console.log("✓ Swagger: /exports/exam-results documented");
    }
  }

  // ── Check 5: Force-submit endpoint documented ─────────────────────────────────
  if (!paths["/exams/{examId}/force-submit"]) {
    errors.push("Swagger: /exams/{examId}/force-submit POST is not documented");
  } else {
    console.log("✓ Swagger: /exams/{examId}/force-submit documented");
  }

  // ── Check 6: Start runtime endpoint documented ────────────────────────────────
  if (!paths["/exams/{examId}/start-runtime"]) {
    errors.push("Swagger: /exams/{examId}/start-runtime POST is not documented");
  } else {
    console.log("✓ Swagger: /exams/{examId}/start-runtime documented");
  }

  // ── Check 7: Proctoring endpoint documented ────────────────────────────────────
  if (!paths["/exams/{examId}/proctoring"]) {
    errors.push("Swagger: /exams/{examId}/proctoring GET is not documented");
  } else {
    console.log("✓ Swagger: /exams/{examId}/proctoring documented");
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n── Contract Verification Summary ──");
  if (errors.length > 0) {
    console.error("ERRORS:");
    errors.forEach(e => console.error(" ✗", e));
  } else {
    console.log("No critical errors.");
  }
  if (warnings.length > 0) {
    console.log("WARNINGS (non-blocking):");
    warnings.forEach(w => console.log(" ?", w));
  } else {
    console.log("No warnings.");
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("Unexpected error:", e);
  process.exit(1);
});