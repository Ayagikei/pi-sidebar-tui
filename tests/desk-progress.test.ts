import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  inferDeskProgress,
  loadDeskOverlay,
  parseDeskProgress,
  stripSessionTitle,
} from "../desk-progress.ts";

test("parseDeskProgress: clamps and trims", () => {
  assert.deepEqual(parseDeskProgress({ percent: 62.4, note: " 固件布局改完 ", title: "Desk Brief UI｜papercolor" }), {
    percent: 62,
    note: "固件布局改完",
    title: "Desk Brief UI",
  });
  assert.equal(parseDeskProgress({ percent: -4 })?.percent, 0);
  assert.equal(parseDeskProgress({ percent: 140 })?.percent, 100);
  assert.equal(parseDeskProgress({ percent: "62" }), null);
  assert.equal(parseDeskProgress({}), null);
});

test("stripSessionTitle: drops project suffix", () => {
  assert.equal(stripSessionTitle("鸿蒙化改造｜harmony-cmp"), "鸿蒙化改造");
  assert.equal(stripSessionTitle("Fix auth | aseta-kmp"), "Fix auth");
});

test("inferDeskProgress: last desk_progress toolCall wins", () => {
  const sm = {
    getBranch() {
      return [
        {
          type: "message",
          message: {
            role: "assistant",
            content: [{ type: "toolCall", name: "desk_progress", arguments: { percent: 10, note: "起步" } }],
          },
        },
        {
          type: "message",
          message: {
            role: "assistant",
            content: [{ type: "toolCall", name: "read", arguments: { path: "README.md" } }],
          },
        },
        {
          type: "message",
          message: {
            role: "assistant",
            content: [{ type: "toolCall", name: "desk_progress", arguments: { percent: 62, note: "D7G 已验收" } }],
          },
        },
      ];
    },
  };
  assert.deepEqual(inferDeskProgress(sm), { percent: 62, note: "D7G 已验收", title: null });
});

test("loadDeskOverlay: matches session id and suffix", () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-sidebar-desk-"));
  const path = join(dir, "desk.json");
  writeFileSync(path, JSON.stringify({
    sessions: {
      abcdef: { percent: 70, note: "待刷机", title: "Desk UI", updatedAt: "2026-08-22T09:00:00Z" },
    },
    alerts: [],
  }));
  assert.deepEqual(loadDeskOverlay("abcdef", path), {
    percent: 70,
    note: "待刷机",
    title: "Desk UI",
  });
  assert.deepEqual(loadDeskOverlay("zz_abcdef", path), {
    percent: 70,
    note: "待刷机",
    title: "Desk UI",
  });
  assert.equal(loadDeskOverlay("missing", path), null);
});
