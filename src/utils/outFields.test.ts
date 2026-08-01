import { describe, expect, it } from "vitest";

import { parseOutFields, toggleOutField } from "./outFields";

describe("toggleOutField", () => {
  it("replaces the wildcard rather than appending to it", () => {
    expect(toggleOutField("*", "objectid")).toBe("objectid");
  });

  it("appends to an explicit list, preserving order", () => {
    expect(toggleOutField("objectid,name", "temp")).toBe("objectid,name,temp");
  });

  it("removes a field that is already selected", () => {
    expect(toggleOutField("objectid,name,temp", "name")).toBe("objectid,temp");
  });

  it("returns to the wildcard when the last field is removed", () => {
    expect(toggleOutField("objectid", "objectid")).toBe("*");
  });

  it("tolerates the spacing a hand-edited list picks up", () => {
    expect(toggleOutField(" objectid , name ", "temp")).toBe("objectid,name,temp");
    expect(toggleOutField("objectid, name", "name")).toBe("objectid");
  });

  it("treats an empty list as no selection", () => {
    expect(toggleOutField("", "temp")).toBe("temp");
  });
});

describe("parseOutFields", () => {
  it("reads an explicit list in order", () => {
    expect(parseOutFields("objectid,name,temp")).toEqual(["objectid", "name", "temp"]);
  });

  it("reports no selection for the wildcard and for a blank list", () => {
    expect(parseOutFields("*")).toEqual([]);
    expect(parseOutFields("")).toEqual([]);
  });

  it("tolerates the spacing a hand-edited list picks up", () => {
    expect(parseOutFields(" objectid , name ")).toEqual(["objectid", "name"]);
  });
});
