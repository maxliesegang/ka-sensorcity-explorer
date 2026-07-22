import { describe, expect, it } from "vitest";

import { escapeCsvCell, rowsToCsv } from "./csv";

describe("escapeCsvCell", () => {
  it("passes benign values through unquoted", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(true)).toBe("true");
  });

  it("renders nullish as an empty field", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("quotes and doubles quotes when a field needs it", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line\nbreak")).toBe('"line\nbreak"');
  });
});

describe("rowsToCsv", () => {
  it("joins escaped rows with commas and newlines", () => {
    expect(
      rowsToCsv([
        ["timestamp", "value", "unit"],
        ["2026-07-22T00:00:00.000Z", 21.5, "°C"],
        ["note", "has, comma", null],
      ]),
    ).toBe(
      'timestamp,value,unit\n2026-07-22T00:00:00.000Z,21.5,°C\nnote,"has, comma",',
    );
  });
});
