export const MAX_ARCHIVE_IMPORT_BYTES = 512 * 1024;
export const MAX_ARCHIVE_ITEMS = 5_000;

export type ArchiveItem = {
  title: string;
  year: number;
  views: string;
};

const normalizeTitle = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 160) : "";

const normalizeYear = (value: unknown) => {
  const year = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : new Date().getFullYear();
};

const normalizeViews = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const text = String(value ?? "").trim().slice(0, 32);
  return text || "—";
};

export const clearArchiveItems = (): ArchiveItem[] => [];

export const isValidArchiveItem = (value: unknown): value is ArchiveItem => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ArchiveItem>;
  const year = candidate.year;
  return typeof candidate.title === "string" && candidate.title.trim().length > 0 && candidate.title.length <= 160
    && typeof year === "number" && Number.isInteger(year) && year >= 1900 && year <= 2200
    && typeof candidate.views === "string" && candidate.views.length <= 32;
};

const normalizeItem = (value: unknown): ArchiveItem | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const title = normalizeTitle(candidate.title ?? candidate.name ?? candidate.headline);
  if (!title) return null;
  return {
    title,
    year: normalizeYear(candidate.year ?? candidate.publishedYear ?? candidate.date),
    views: normalizeViews(candidate.views ?? candidate.viewCount ?? candidate.plays),
  };
};

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
};

const parseCsv = (text: string): unknown[] => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1, MAX_ARCHIVE_ITEMS + 1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
};

export function parseArchiveManifest(text: string, filename = "archive.json"): ArchiveItem[] {
  if (typeof text !== "string" || text.length === 0) throw new Error("The archive file is empty.");
  if (text.length > MAX_ARCHIVE_IMPORT_BYTES) throw new Error("The archive file is too large. Choose a file under 512 KB.");

  let raw: unknown;
  if (filename.toLowerCase().endsWith(".csv")) {
    raw = parseCsv(text);
  } else {
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error("This file is not valid JSON. Choose a JSON or CSV archive manifest.");
    }
  }

  const values = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
    ? (raw as { items: unknown[] }).items
    : [];
  const items = values.slice(0, MAX_ARCHIVE_ITEMS).map(normalizeItem).filter((item): item is ArchiveItem => item !== null && isValidArchiveItem(item));
  if (items.length === 0) throw new Error("No archive items were found. Include title, year, and optional views columns.");
  return items;
}
