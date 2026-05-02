export function getRank(cr: number) {
  const ranks: [number, string][] = [
    [0, "R1 Rookie Low"], [150, "R1 Rookie Mid"], [300, "R1 Rookie High"],
    [400, "R2 Amateur Low"], [500, "R2 Amateur Mid"], [600, "R2 Amateur High"],
    [700, "R3 Pro Low"], [800, "R3 Pro Mid"], [900, "R3 Pro High"],
    [1000, "R4 Elite Low"], [1075, "R4 Elite Mid"], [1150, "R4 Elite High"],
    [1200, "R5 All-Star Low"], [1325, "R5 All-Star Mid"], [1450, "R5 All-Star High"],
    [1600, "R6 SuperStar Low"], [1750, "R6 SuperStar Mid"], [1900, "R6 SuperStar High"],
    [2100, "R7 Remorseless Low"], [2300, "R7 Remorseless Mid"], [2500, "R7 Remorseless High"],
    [2750, "R8 Legend Low"], [3000, "R8 Legend Mid"], [3250, "R8 Legend High"],
    [3550, "R9 Unreal Low"], [3850, "R9 Unreal Mid"], [4150, "R9 Unreal High"],
    [4500, "R10 Hall Of Fame Low"], [4900, "R10 Hall Of Fame Mid"], [5300, "R10 Hall Of Fame High"]
  ];
  let current = ranks[0][1];
  for (const [need, name] of ranks) if (cr >= need) current = name;
  return current;
}
