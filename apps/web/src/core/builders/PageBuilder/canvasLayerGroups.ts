import type {PageComponentMetadata} from '../../metadata/Definitions/metadata';

type Position = NonNullable<PageComponentMetadata['position']>;
const parentId = (item: PageComponentMetadata) =>
  typeof item.properties.layoutParentId === 'string' && item.properties.layoutParentId
    ? item.properties.layoutParentId : item.parentId || null;

export const canvasGroupKey = (item: PageComponentMetadata | undefined): string | null =>
  typeof item?.properties.canvasGroupId === 'string' && item.properties.canvasGroupId
    ? item.properties.canvasGroupId : null;

export function canvasGroupMembers(components: readonly PageComponentMetadata[], item: PageComponentMetadata) {
  const id = canvasGroupKey(item);
  return id ? components.filter(other => canvasGroupKey(other) === id && parentId(other) === parentId(item)) : [item];
}

export function groupCanvasSelection(components: readonly PageComponentMetadata[], ids: readonly string[], groupId: string) {
  const selection = new Set(ids);
  const members = components.filter(item => selection.has(item.id));
  if (members.length < 2 || members.length !== selection.size ||
      members.some(item => !item.position || item.properties.editorLocked === true ||
        parentId(item) !== parentId(members[0]) || canvasGroupKey(item))) return [...components];
  return components.map(item => selection.has(item.id)
    ? {...item, properties: {...item.properties, canvasGroupId: groupId}} : item);
}

export function ungroupCanvasSelection(components: readonly PageComponentMetadata[], id: string) {
  const chosen = components.find(item => item.id === id);
  const group = canvasGroupKey(chosen);
  if (!group) return [...components];
  return components.map(item => {
    if (canvasGroupKey(item) !== group) return item;
    const properties = {...item.properties};
    delete properties.canvasGroupId;
    return {...item, properties};
  });
}

/** Reorder sibling slots only. Grouped members stay together, without changing other parents. */
export function moveCanvasLayer(
  components: readonly PageComponentMetadata[], id: string, edge: 'front' | 'back'
): PageComponentMetadata[] {
  const selected = components.find(item => item.id === id);
  if (!selected || selected.properties.editorLocked === true) return [...components];
  const siblings = components.filter(item => parentId(item) === parentId(selected));
  const moving = canvasGroupMembers(siblings, selected);
  const groupIds = new Set(moving.map(item => item.id));
  const others = siblings.filter(item => !groupIds.has(item.id));
  const ordered = edge === 'front' ? [...others, ...moving] : [...moving, ...others];
  let cursor = 0;
  return components.map(item => parentId(item) === parentId(selected) ? ordered[cursor++] : item);
}

export function canvasGroupBounds(members: readonly PageComponentMetadata[]): Position | null {
  if (members.length < 2 || members.some(item => !item.position)) return null;
  const positions = members.map(item => item.position!);
  const x = Math.min(...positions.map(pos => pos.x));
  const y = Math.min(...positions.map(pos => pos.y));
  return {x, y, width: Math.max(...positions.map(pos => pos.x + pos.width)) - x,
    height: Math.max(...positions.map(pos => pos.y + pos.height)) - y};
}

/** Proportional geometry while preserving all original component metadata and identities. */
export function scaleCanvasGroup(
  members: readonly PageComponentMetadata[], next: Position
): Map<string, Position> {
  const original = canvasGroupBounds(members);
  const result = new Map<string, Position>();
  if (!original || original.width <= 0 || original.height <= 0) return result;
  for (const item of members) {
    const position = item.position!;
    result.set(item.id, {
      x: Math.round(next.x + (position.x - original.x) * next.width / original.width),
      y: Math.round(next.y + (position.y - original.y) * next.height / original.height),
      width: Math.max(1, Math.round(position.width * next.width / original.width)),
      height: Math.max(1, Math.round(position.height * next.height / original.height))
    });
  }
  return result;
}
