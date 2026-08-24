import { describe, expect, it } from "vitest";

import { clearArchiveItems, filterArchiveItems, formatArchivePreviewRow, getArchiveItemKey, getArchivePreviewContextLabel, getArchivePreviewLabel, getArchivePreviewRestoredNotice, getArchivePreviewResumeLabel, getSelectedArchiveItems, isValidArchiveItem, MAX_ARCHIVE_IMPORT_BYTES, parseArchiveManifest, serializeArchiveCsv, serializeArchiveManifest, sortArchiveItems, toggleArchiveSelection } from "../lib/archive-import";

describe("parseArchiveManifest", () => {
  it("parses JSON arrays and normalizes common archive fields", () => {
    expect(parseArchiveManifest(JSON.stringify([{ name: " A video ", publishedYear: "2023", viewCount: 1200, url: "https://example.com/video" }]), "export.json")).toEqual([
      { title: "A video", year: 2023, views: "1200", sourceUrl: "https://example.com/video" },
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

  it("selects archive rows by stable keys while preserving source order", () => {
    const items = [
      { title: "First", year: 2024, views: "1K" },
      { title: "Second", year: 2023, views: "2K" },
    ];
    expect(getSelectedArchiveItems(items, [getArchiveItemKey(items[1])])).toEqual([items[1]]);
    expect(getSelectedArchiveItems(items, [])).toEqual([]);
  });

  it("toggles visible selections without dropping hidden selections", () => {
    const first = { title: "First", year: 2024, views: "1K" };
    const second = { title: "Second", year: 2023, views: "2K" };
    const firstKey = getArchiveItemKey(first);
    const secondKey = getArchiveItemKey(second);
    expect(toggleArchiveSelection([firstKey], [second])).toEqual([firstKey, secondKey]);
    expect(toggleArchiveSelection([firstKey, secondKey], [second])).toEqual([firstKey]);
  });

  it("formats a restored-preview notice with the source name and count", () => {
    expect(getArchivePreviewRestoredNotice([{ title: "Video", year: 2024, views: "1K" }], "saved.json")).toBe("Restored 1 archive item from saved.json. Review the preview before using this archive.");
  });

  it("formats the resume-preview card label with a count and source", () => {
    expect(getArchivePreviewResumeLabel([{ title: "Video", year: 2024, views: "1K" }], "saved.json")).toBe("Resume 1 item from saved.json");
  });

  it("formats recovery-card preview context with selected count", () => {
    expect(getArchivePreviewContextLabel([{ title: "Video", year: 2024, views: "1K" }], 1)).toBe("1 preview item · 1 selected for export");
  });

  it("rejects insecure or malformed source URLs from persisted records", () => {
    expect(isValidArchiveItem({ title: "Video", year: 2024, views: "1K", sourceUrl: "http://example.com" })).toBe(false);
    expect(isValidArchiveItem({ title: "Video", year: 2024, views: "1K", sourceUrl: "https://example.com/video" })).toBe(true);
  });

  it("serializes normalized archive data as quoted CSV with source URLs", () => {
    expect(serializeArchiveCsv([{ title: 'A "quoted" video', year: 2024, views: "1K", sourceUrl: "https://example.com/a,b" }])).toBe('title,year,views,sourceUrl\n"A ""quoted"" video","2024","1K","https://example.com/a,b"\n');
  });

  it("serializes a normalized archive manifest deterministically", () => {
    expect(serializeArchiveManifest([{ title: "Video", year: 2024, views: "1K" }])).toBe('[\n  {\n    "title": "Video",\n    "year": 2024,\n    "views": "1K"\n  }\n]\n');
  });

  it("sorts archive items by newest year and views without mutation", () => {
    const items = [
      { title: "Older", year: 2022, views: "90" },
      { title: "Popular", year: 2023, views: "12.5K" },
      { title: "Newest", year: 2024, views: "2K" },
    ];
    expect(sortArchiveItems(items, "newest").map((item) => item.title)).toEqual(["Newest", "Popular", "Older"]);
    expect(sortArchiveItems(items, "views").map((item) => item.title)).toEqual(["Popular", "Newest", "Older"]);
    expect(items[0].title).toBe("Older");
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
