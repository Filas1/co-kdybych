// Fonts for images generated with next/og (Open Graph image, icons). The image renderer cannot use
// next/font, so it gets the TTF files directly. Space Grotesk, SIL Open Font License (assets/fonts/OFL.txt).
//
// Read synchronously on purpose: with Cache Components, an async file read counts as uncached I/O
// and turns the image routes dynamic (generated on every request). A sync read at module load
// keeps them static, built once.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const fontsDir = join(process.cwd(), "assets/fonts");
const regular = readFileSync(join(fontsDir, "SpaceGrotesk-Regular.ttf"));
const bold = readFileSync(join(fontsDir, "SpaceGrotesk-Bold.ttf"));

export const ogFonts = [
  { name: "Space Grotesk", data: regular, weight: 400 as const, style: "normal" as const },
  { name: "Space Grotesk", data: bold, weight: 700 as const, style: "normal" as const },
];
