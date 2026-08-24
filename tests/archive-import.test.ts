import { describe, expect, it } from "vitest";

import { clearArchiveItems, filterArchiveItems, formatArchivePreviewRow, getArchivePreviewLabel, isValidArchiveItem, MAX_ARCHIVE_IMPORT_BYTES, parseArchiveManifest } from "../lib/archive-import";

describe("parseArchiveManifest", () => {
  it("parses JSON arrays and normalizes common archive fields", () => {
    expect(parseArchiveManifest(JSON.stringify([{ name: " A video ", publishedYear: "2023", viewCount: 1200 }]), "export.json")).toEqual([
      { title: "A video", year: 2023, views: "1200" },
    ]);
  });

  it("parses wrapped JSON item collections", () => {
    expect(parseArchiveManifest(JSON.stringify({ items: [{ title: "Essay", year: 2020, views: "4.2K" }] }))).toHaveLength(1);
  });

  it("parses quoted CSV values", () => {
    expect(parseArchiveManifest('title,year,views\n"A, B",2022,8.7K', "archive.csv")).toEqual([
      { title: "A, B", year: 2022, views: "8.7K" },
    ]);
  });

  it("filters archive items by title and year", () => {
    const items = [
      { title: "AI Editing", year: 2024, views: "1K" },
      { title: "Field Notes", year: 2023, views: "2K" },
    ];
    expect(filterArchiveItems(items, "ai", "")).toEqual([items[0]]);
    expect(filterArchiveItems(items, "", "2023")).toEqual([items[1]]);
    expect(filterArchiveItems(items, "notes", "2024")).toEqual([]);
  });

  it("formats a readable archive preview row", () => {
    expect(formatArchivePreviewRow({ title: "A, B", year: 2022, views: "8.7K" })).toBe("A, B · 2022 · 8.7K views");
  });

  it("formats a concise import preview label", () => {
    expect(getArchivePreviewLabel([{ title: "Video", year: 2024, views: "1K" }], "archive.csv")).toBe("1 item ready from archive.csv");
  });

  it("returns a fresh empty state for imported-archive clearing", () => {
    const cleared = clearArchiveItems();
    expect(cleared).toEqual([]);
    expect(cleared).not.toBe(clearArchiveItems());
  });

  it("validates persisted archive records conservatively", () => {
    expect(isValidArchiveItem({ title: "Video", year: 2024, views: "1.2K" })).toBe(true);
    expect(isValidArchiveItem({ title: "", year: 2024, views: "1.2K" })).toBe(false);
    expect(isValidArchiveItem({ title: "Video", year: "2024", views: "1.2K" })).toBe(false);
  });

  it("rejects malformed, empty, and oversized files", () => {
    expect(() => parseArchiveManifest("not-json", "archive.json")).toThrow(/valid JSON/);
    expect(() => parseArchiveManifest("title,year\n,2022", "archive.csv")).toThrow(/No archive items/);
    expect(() => parseArchiveManifest("x".repeat(MAX_ARCHIVE_IMPORT_BYTES + 1))).toThrow(/too large/);
  });
});
