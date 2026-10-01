import { describe, it, expect } from "vitest";
import {
  isMalformedScheduleAt,
  normalizeScheduleAtInput,
  durationMinFromSchedule,
  isBeforeOpensAt,
  isPastEndsAt,
  effectiveEndsAt,
} from "./examSchedule";
import {
  isMalformedClosesAt,
  isPastClosesAt,
  normalizeClosesAtInput,
} from "./examStartDeadline";

describe("examSchedule utility tests", () => {
  it("validates malformed schedule dates", () => {
    expect(isMalformedScheduleAt(null)).toBe(false);
    expect(isMalformedScheduleAt(undefined)).toBe(false);
    expect(isMalformedScheduleAt("2026-05-01T08:00:00.000Z")).toBe(false);
    expect(isMalformedScheduleAt("invalid-date-string")).toBe(true);
  });

  it("normalizes ISO schedule strings", () => {
    expect(normalizeScheduleAtInput(null)).toBeNull();
    expect(normalizeScheduleAtInput(undefined)).toBeNull();
    const iso = "2026-05-01T08:00:00.000Z";
    expect(normalizeScheduleAtInput(iso)).toBe(new Date(iso).toISOString());
  });

  it("calculates duration minutes between opens_at and ends_at", () => {
    const opens = "2026-05-01T08:00:00.000Z";
    const ends = "2026-05-01T09:30:00.000Z";
    expect(durationMinFromSchedule(opens, ends)).toBe(90);
    expect(durationMinFromSchedule(null, ends)).toBeNull();
  });

  it("checks whether current time is before opens_at or past ends_at", () => {
    const pastTime = "2020-01-01T08:00:00.000Z";
    const futureTime = "2030-01-01T08:00:00.000Z";
    const now = new Date("2026-01-01T08:00:00.000Z").getTime();

    expect(isBeforeOpensAt(futureTime, now)).toBe(true);
    expect(isBeforeOpensAt(pastTime, now)).toBe(false);

    expect(isPastEndsAt(pastTime, now)).toBe(true);
    expect(isPastEndsAt(futureTime, now)).toBe(false);
  });

  it("computes effective ends_at from exam fields", () => {
    const examWithEndsAt = { ends_at: "2026-05-01T10:00:00.000Z", closes_at: null };
    expect(effectiveEndsAt(examWithEndsAt)).toBe("2026-05-01T10:00:00.000Z");

    const examWithClosesAt = { ends_at: null, closes_at: "2026-05-01T12:00:00.000Z" };
    expect(effectiveEndsAt(examWithClosesAt)).toBe("2026-05-01T12:00:00.000Z");
  });
});

describe("examStartDeadline utility tests", () => {
  it("validates and normalizes closes_at", () => {
    expect(isMalformedClosesAt(null)).toBe(false);
    expect(isMalformedClosesAt("invalid-date")).toBe(true);
    const valid = "2026-05-01T12:00:00.000Z";
    expect(normalizeClosesAtInput(valid)).toBe(new Date(valid).toISOString());
  });

  it("checks if closes_at has passed", () => {
    const past = "2020-01-01T00:00:00.000Z";
    const future = "2030-01-01T00:00:00.000Z";
    const now = new Date("2026-01-01T00:00:00.000Z").getTime();
    expect(isPastClosesAt(past, now)).toBe(true);
    expect(isPastClosesAt(future, now)).toBe(false);
  });
});
