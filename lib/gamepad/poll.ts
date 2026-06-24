export function readButtons(gp: Gamepad): boolean[] {
  return gp.buttons.map((b) => b.pressed);
}

export function detectButtonDowns(prev: boolean[], curr: boolean[]): number[] {
  const downs: number[] = [];
  for (let i = 0; i < curr.length; i++) {
    if (curr[i] && !prev[i]) downs.push(i);
  }
  return downs;
}
