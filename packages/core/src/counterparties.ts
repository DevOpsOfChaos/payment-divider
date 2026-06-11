import type { EntityId, ISODateTimeString } from "./domain-types";

// Central person/counterparty layer (issue #88). Private claims (and later
// shared subscriptions) reference counterparties instead of storing raw
// free-text names per record. A counterparty is owned by the user who created
// it; external/free-text counterparties stay private to their owner.

export type CounterpartyKind = "app_user" | "invited_person" | "external_person";

export interface Counterparty {
  id: EntityId;
  ownerUserId: EntityId;
  kind: CounterpartyKind;
  displayName: string;
  // Lowercased, trimmed, whitespace-collapsed form for duplicate detection.
  normalizedName: string;
  linkedUserId?: EntityId;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  archivedAt?: ISODateTimeString;
}

export interface CounterpartyAlias {
  id: EntityId;
  counterpartyId: EntityId;
  alias: string;
  normalizedAlias: string;
  createdAt: ISODateTimeString;
}

export function normalizeCounterpartyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isCounterpartyLinked(counterparty: Counterparty): boolean {
  return counterparty.kind === "app_user" && counterparty.linkedUserId !== undefined;
}

// Links an external/invited counterparty to an app user. Pure upgrade: the
// kind becomes app_user and the linked user id is set. Linking NEVER touches
// claim visibility — existing claims keep sharedWithCounterparty = false until
// the owner explicitly opts in per claim (see claims.ts).
export function linkCounterpartyToUser(
  counterparty: Counterparty,
  linkedUserId: EntityId,
  linkedAt: ISODateTimeString,
): Counterparty {
  if (isCounterpartyLinked(counterparty)) {
    throw new Error(`Counterparty ${counterparty.id} is already linked to an app user.`);
  }
  return {
    ...counterparty,
    kind: "app_user",
    linkedUserId,
    updatedAt: linkedAt,
  };
}

export interface DuplicateCandidate {
  counterparty: Counterparty;
  duplicateOf: Counterparty;
  matchedVia: "name" | "alias";
}

// Duplicate-detection groundwork: flags counterparties of the same owner with
// identical normalized names or aliases. Suggestions only — merging is always
// an explicit user decision and is not implemented here.
export function findPotentialDuplicates(
  counterparties: Counterparty[],
  aliases: CounterpartyAlias[] = [],
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];
  const active = counterparties.filter((counterparty) => !counterparty.archivedAt);

  const namesByCounterpartyId = new Map<EntityId, Set<string>>();
  for (const counterparty of active) {
    namesByCounterpartyId.set(counterparty.id, new Set([counterparty.normalizedName]));
  }
  for (const alias of aliases) {
    namesByCounterpartyId.get(alias.counterpartyId)?.add(alias.normalizedAlias);
  }

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const left = active[i];
      const right = active[j];
      if (left.ownerUserId !== right.ownerUserId) {
        continue;
      }
      const leftNames = namesByCounterpartyId.get(left.id) ?? new Set();
      const rightNames = namesByCounterpartyId.get(right.id) ?? new Set();
      const viaName = leftNames.has(right.normalizedName) || rightNames.has(left.normalizedName);
      const viaAlias = [...leftNames].some((name) => rightNames.has(name));
      if (viaName || viaAlias) {
        candidates.push({
          counterparty: right,
          duplicateOf: left,
          matchedVia: viaName ? "name" : "alias",
        });
      }
    }
  }

  return candidates;
}
