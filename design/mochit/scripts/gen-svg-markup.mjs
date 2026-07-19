import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("../source/mochit-layered.svg", "utf8");
const lines = src.split("\n");
// drop opening <svg ...> (line 0) and closing </svg> (last non-empty)
let inner = lines.slice(1).join("\n");
inner = inner.replace(/\s*<\/svg>\s*$/, "\n");

// 1. clip paths into defs
const clip = `    <clipPath id="eyeClipL"><rect x="466" y="561" width="60" height="105" rx="30"/></clipPath>
    <clipPath id="eyeClipR"><rect x="704" y="561" width="60" height="105" rx="30"/></clipPath>
  </defs>`;
inner = inner.replace("  </defs>", clip);

// 2. animation wrapper groups just inside Mochit_Root
inner = inner.replace(
  '<g id="Mochit_Root" transform="scale(0.816587)">',
  '<g id="Mochit_Root" transform="scale(0.816587)">\n  <g id="Anim_Sway"><g id="Anim_Breathe">'
);
// 3. close the wrappers: the final </g> closes Mochit_Root
inner = inner.replace(/(\s*)<\/g>(\s*)$/, '$1</g></g></g>$2');

// 3b. wrap the three antenna groups so antenna lag can rotate them as one unit
//     without clobbering Antenna_Tip's own translate/rotate transform attribute.
if (!inner.includes('<g id="Antenna_Base">')) throw new Error("antenna anchor moved");
inner = inner.replace('<g id="Antenna_Base">', '<g id="Anim_Antenna"><g id="Antenna_Base">');
inner = inner.replace('    <!-- Main body fill', '    </g>\n\n    <!-- Main body fill');

// 4. clip pupils + highlights to the eye whites so gaze offsets never overhang
inner = inner
  .replace('<g id="Pupil_L">', '<g id="Pupil_L" clip-path="url(#eyeClipL)">')
  .replace('<g id="Pupil_R">', '<g id="Pupil_R" clip-path="url(#eyeClipR)">')
  .replace('<g id="EyeHighlight_L">', '<g id="EyeHighlight_L" clip-path="url(#eyeClipL)">')
  .replace('<g id="EyeHighlight_R">', '<g id="EyeHighlight_R" clip-path="url(#eyeClipR)">');

// sanity checks
const need = ["Anim_Sway","Anim_Breathe","Anim_Antenna","eyeClipL","eyeClipR",
  'id="Pupil_L" clip-path','id="EyeHighlight_R" clip-path'];
for (const n of need) if (!inner.includes(n)) throw new Error("missing edit: " + n);
const opens = (inner.match(/<g\b/g)||[]).length;
const closes = (inner.match(/<\/g>/g)||[]).length;
if (opens !== closes) throw new Error(`unbalanced <g>: ${opens} open vs ${closes} close`);

const out = `// AUTO-GENERATED from design/mochit/source/mochit-layered.svg by design/mochit/scripts/gen-svg-markup.mjs.
// Do not edit by hand. Re-run the generator if the design SVG changes.
// Edits applied vs. the source: (1) eyeClipL/eyeClipR clip paths, (2) Anim_Sway/
// Anim_Breathe wrapper groups inside Mochit_Root, (3) clip-path on the pupil and
// eye-highlight groups so gaze offsets are masked to the eye whites.
// The <svg> element itself is provided by MochitSvg.tsx.

export const MOCHIT_SVG_MARKUP = ${JSON.stringify(inner)};
`;
writeFileSync("../../../components/mochit/mochitSvgMarkup.ts", out);
console.log("wrote components/mochit/mochitSvgMarkup.ts");
console.log("g open/close:", opens, closes);
