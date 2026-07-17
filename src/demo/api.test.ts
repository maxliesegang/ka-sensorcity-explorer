import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Feature } from "../types";
import type { DemoSnapshot } from "./snapshot";

// Serve a tiny in-memory snapshot so the interpreter can be tested without the
// real (multi-MB) dataset or any network.
const liveFeatures: Feature[] = [
  {
    attributes: { objectid: 1, name: "A", beschreibung: "Temperatur-Sensor", temp: 20, bodenfeuchte: null },
    geometry: { x: 8.4, y: 49.0 },
  },
  {
    attributes: { objectid: 2, name: "B", beschreibung: "Boden-Sensor", temp: null, bodenfeuchte: 80 },
    geometry: { x: 8.5, y: 49.1 },
  },
  {
    attributes: { objectid: 3, name: "C", beschreibung: "Temperatur-Sensor", temp: 25, bodenfeuchte: null },
    geometry: { x: 8.6, y: 49.2 },
  },
];

const snapshot: DemoSnapshot = {
  capturedAt: "2026-01-01T00:00:00.000Z",
  historyMaxRows: 1500,
  liveFeatures,
  counts: { 1: 3, 2: 99 },
  fields: { 1: [{ name: "objectid", type: "esriFieldTypeOID" }] },
  history: { "2:dev-1:temp": [{ timestamp: 10, value: 1 }] },
  rawArchiveFeatures: {
    2: [
      { attributes: { objectid: 1, device_id: "dev-1", temp: 12 } },
      { attributes: { objectid: 2, device_id: "dev-1", temp: 13 } },
    ],
  },
  hvzWaterLevels: { "109": [{ timestamp: 5, value: 100 }] },
  brightskyHourly: [
    { timestamp: Date.UTC(2026, 0, 1, 12), temperature: 5, observed: true },
    { timestamp: Date.UTC(2026, 0, 3, 12), temperature: 7, observed: true },
  ],
  brightskyCurrent: { timestamp: 1, temperature: 9, observed: true },
};

vi.mock("./snapshot", () => ({
  loadSnapshot: () => Promise.resolve(snapshot),
}));

let api: typeof import("./api");

beforeEach(async () => {
  api = await import("./api");
});

describe("query", () => {
  it("returns all live features with geometry and paging metadata", async () => {
    const res = await api.query(1, { where: "1=1", outFields: "*", returnGeometry: true });
    expect(res.features).toHaveLength(3);
    expect(res.features[0].geometry).toBeDefined();
    expect(res.exceededTransferLimit).toBe(false);
  });

  it("drops geometry and projects outFields when asked", async () => {
    const res = await api.query(1, { where: "1=1", outFields: "objectid,name" });
    expect(res.features[0].geometry).toBeUndefined();
    expect(Object.keys(res.features[0].attributes)).toEqual(["objectid", "name"]);
  });

  it("filters by an equality clause", async () => {
    const res = await api.query(1, { where: "beschreibung='Temperatur-Sensor'" });
    expect(res.features.map((f) => f.attributes.objectid)).toEqual([1, 3]);
  });

  it("filters by a compound AND of equality and comparison", async () => {
    const res = await api.query(1, {
      where: "beschreibung='Boden-Sensor' AND bodenfeuchte >= 75",
    });
    expect(res.features.map((f) => f.attributes.objectid)).toEqual([2]);
  });

  it("orders and pages, flagging more rows", async () => {
    const res = await api.query(1, {
      where: "1=1",
      orderByFields: "objectid DESC",
      resultRecordCount: 2,
    });
    expect(res.features.map((f) => f.attributes.objectid)).toEqual([3, 2]);
    expect(res.exceededTransferLimit).toBe(true);
  });

  it("computes count grouped by a field for outStatistics", async () => {
    const res = await api.query(1, {
      groupByFieldsForStatistics: "beschreibung",
      outStatistics: [
        { statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "cnt" },
      ],
    });
    const byCategory = Object.fromEntries(
      res.features.map((f) => [f.attributes.beschreibung, f.attributes.cnt]),
    );
    expect(byCategory).toEqual({ "Temperatur-Sensor": 2, "Boden-Sensor": 1 });
  });

  it("serves the raw archive sample for archive layers", async () => {
    const res = await api.query(2, { where: "temp >= 13", outFields: "objectid,temp" });
    expect(res.features.map((f) => f.attributes.objectid)).toEqual([2]);
  });

  it("returns no rows for an archive layer with no stored sample", async () => {
    const res = await api.query(5, { where: "1=1" });
    expect(res.features).toHaveLength(0);
  });
});

describe("count", () => {
  it("counts filtered live features", async () => {
    expect(await api.count(1, "beschreibung='Temperatur-Sensor'")).toBe(2);
  });

  it("uses the stored total for archive layers", async () => {
    expect(await api.count(2, "1=1")).toBe(99);
  });
});

describe("history and fallback providers", () => {
  it("looks up history by composite key", async () => {
    expect(await api.history(2, "dev-1", "temp")).toEqual([{ timestamp: 10, value: 1 }]);
    expect(await api.history(2, "missing", "temp")).toEqual([]);
  });

  it("returns HVZ water-level history by station id", async () => {
    expect(await api.hvzWaterLevelHistory(109)).toEqual([{ timestamp: 5, value: 100 }]);
  });

  it("filters brightsky hourly to the requested date range", async () => {
    const points = await api.brightskyHourly(
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 0, 1)),
    );
    expect(points).toHaveLength(1);
    expect(points[0].temperature).toBe(5);
  });

  it("returns the captured current observation", async () => {
    expect(await api.brightskyCurrent()).toEqual({ timestamp: 1, temperature: 9, observed: true });
  });
});
