import { describe, expect, it } from "vitest";
import { GoogleSourceError, saveGoogleSourceSelection } from "@/server/googleCalendar/sources";

type SourceRow = {
  id: string;
  user_id: string;
  connection_id: string;
  source_local_id: string;
  display_name: string;
  selected: boolean;
  provider_access_role: string | null;
  source_time_zone: string | null;
};

function memoryAdmin(options?: { ownerId?: string; connectionOwnerId?: string }) {
  const ownerId = options?.ownerId ?? "user-1";
  const connectionOwnerId = options?.connectionOwnerId ?? ownerId;
  const sources = new Map<string, SourceRow>();
  let seq = 0;

  const admin = {
    from(table: string) {
      if (table === "external_temporal_connections") {
        return {
          select() {
            return {
              eq(_field: string, connectionId: string) {
                return {
                  eq(_userField: string, userId: string) {
                    return {
                      async maybeSingle() {
                        if (connectionId === "conn-1" && userId === connectionOwnerId) {
                          return { data: { id: "conn-1", user_id: connectionOwnerId }, error: null };
                        }
                        return { data: null, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "external_temporal_sources") {
        return {
          select(columns: string) {
            if (columns === "id") {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        eq(_field: string, sourceLocalId: string) {
                          return {
                            async maybeSingle() {
                              const found = [...sources.values()].find(
                                (row) =>
                                  row.connection_id === "conn-1" &&
                                  row.source_local_id === sourceLocalId,
                              );
                              return { data: found ? { id: found.id } : null, error: null };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            }
            if (columns === "id, source_local_id") {
              return {
                eq() {
                  return {
                    async eq() {
                      return {
                        data: [...sources.values()].map((row) => ({
                          id: row.id,
                          source_local_id: row.source_local_id,
                        })),
                        error: null,
                      };
                    },
                  };
                },
              };
            }
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        return Promise.resolve({ data: [...sources.values()], error: null });
                      },
                    };
                  },
                };
              },
            };
          },
          async insert(row: Omit<SourceRow, "id"> & { created_at: string; updated_at: string }) {
            seq += 1;
            const id = `source-${seq}`;
            sources.set(id, { id, ...row });
            return { error: null };
          },
          update(row: Partial<SourceRow> & { updated_at?: string }) {
            return {
              eq(field: string, value: string) {
                if (field === "id") {
                  return {
                    async eq() {
                      const current = sources.get(value);
                      if (current) sources.set(value, { ...current, ...row });
                      return { error: null };
                    },
                  };
                }
                // bulk deselect by user/connection
                return {
                  async eq() {
                    for (const [id, current] of sources) {
                      sources.set(id, { ...current, ...row });
                    }
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(table);
    },
  };
  return { admin: admin as never, sources };
}

const enumerated = [
  {
    sourceLocalId: "cal-a",
    displayName: "Alpha",
    primary: true,
    accessRole: "owner",
    sourceTimeZone: "America/Boise",
  },
  {
    sourceLocalId: "cal-b",
    displayName: "Beta",
    primary: false,
    accessRole: "reader",
    sourceTimeZone: null,
  },
];

describe("Google source selection", () => {
  it("does not auto-select calendars and persists explicit selection identity", async () => {
    const { admin, sources } = memoryAdmin();
    await saveGoogleSourceSelection(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        selectedSourceLocalIds: [],
        enumerated,
      },
      admin,
    );
    expect([...sources.values()].every((row) => row.selected === false)).toBe(true);
    expect(sources.size).toBe(2);

    await saveGoogleSourceSelection(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        selectedSourceLocalIds: ["cal-b"],
        enumerated,
      },
      admin,
    );
    const byLocal = () => new Map([...sources.values()].map((row) => [row.source_local_id, row]));
    expect(byLocal().get("cal-a")?.selected).toBe(false);
    expect(byLocal().get("cal-b")?.selected).toBe(true);
    const alphaId = byLocal().get("cal-a")!.id;

    await saveGoogleSourceSelection(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        selectedSourceLocalIds: ["cal-b"],
        enumerated: [
          { ...enumerated[0]!, displayName: "Alpha Renamed" },
          enumerated[1]!,
        ],
      },
      admin,
    );
    expect(sources.size).toBe(2);
    expect(byLocal().get("cal-a")?.display_name).toBe("Alpha Renamed");
    expect(byLocal().get("cal-a")?.id).toBe(alphaId);

    await saveGoogleSourceSelection(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        selectedSourceLocalIds: [],
        enumerated,
      },
      admin,
    );
    expect([...sources.values()].every((row) => row.selected === false)).toBe(true);
  });

  it("rejects arbitrary unenumerated source injection", async () => {
    const { admin } = memoryAdmin();
    await expect(
      saveGoogleSourceSelection(
        {
          authenticatedUserId: "user-1",
          connectionId: "conn-1",
          selectedSourceLocalIds: ["not-enumerated"],
          enumerated,
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(GoogleSourceError);
  });

  it("rejects another user's Connection", async () => {
    const { admin } = memoryAdmin({ ownerId: "user-1", connectionOwnerId: "other-user" });
    await expect(
      saveGoogleSourceSelection(
        {
          authenticatedUserId: "user-1",
          connectionId: "conn-1",
          selectedSourceLocalIds: ["cal-a"],
          enumerated,
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "unauthorized_connection" });
  });
});
