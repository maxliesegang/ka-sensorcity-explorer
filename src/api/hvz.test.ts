import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchHvzWaterLevelHistory } from "./hvz";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchHvzWaterLevelHistory", () => {
  it("reads and normalizes one station's FeatureServer history", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            { attributes: { datum: 20, pegel: 31.5 } },
            { attributes: { datum: null, pegel: 40 } },
            { attributes: { datum: 30, pegel: null } },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHvzWaterLevelHistory(109)).resolves.toEqual([
      { timestamp: 20, value: 31.5 },
    ]);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toContain(
      "/Sensordaten_HVZ_Pegelstaende/FeatureServer/0/query",
    );
    expect(url.searchParams.get("where")).toBe("srid=109");
    expect(url.searchParams.get("outFields")).toBe("datum,pegel");
    expect(url.searchParams.get("orderByFields")).toBe(
      "datum ASC,objectid ASC",
    );
  });

  it("surfaces ArcGIS error envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 400, message: "Bad query" } })),
      ),
    );

    await expect(fetchHvzWaterLevelHistory(110)).rejects.toThrow("Bad query");
  });

  it("continues when ArcGIS reports a transfer limit on a short page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            features: [{ attributes: { datum: 10, pegel: 20 } }],
            exceededTransferLimit: true,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            features: [{ attributes: { datum: 20, pegel: 21 } }],
            exceededTransferLimit: false,
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHvzWaterLevelHistory(109)).resolves.toEqual([
      { timestamp: 10, value: 20 },
      { timestamp: 20, value: 21 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(secondUrl.searchParams.get("resultOffset")).toBe("1");
  });

  it("rejects non-integer station ids before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHvzWaterLevelHistory(1.5)).rejects.toThrow(
      "station id must be an integer",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
