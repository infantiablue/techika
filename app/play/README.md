# Hearth & Horizon

Play at `/play/`. Five missions award up to 1,350 points per walk. Collecting items adds them to the bag and earns pickup points, but each of the four item missions only completes after a full set is delivered with E or the Deliver button at the bakery house marker. Delivered items leave the bag and cannot be collected or rewarded again. Exploration completes by visiting all four landmarks. Progress resets on reload or “Start a fresh walk.”

An original gentle melody and accompaniment loop during play using Web Audio, with no music download. Music and sound effects start after a user gesture; the speaker button mutes both. Music pauses with the game and when the page loses focus or is hidden.

## Supplied assets

The supplied original bakery is included in `public/play-assets/bakery/`, with its textures, windmill animation, and original license. The supplied BigHero character is included as `public/play-assets/bighero/character.glb`. Surrounding island buildings remain procedural.

- Bakery: [Ancient Greek Bakery by Bram Verheyen](https://sketchfab.com/3d-models/dae-villages-ancient-greek-bakery-364b1b220b1943999d69180b5f322ca5), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution also appears in the field guide.
- The loader scales and positions the bakery, runs supplied animations, and replaces the temporary bakery and its collision boundaries. Deliveries happen outside the front of the diorama; its interior is not walkable. A failed load leaves the temporary bakery visible and reports the failure in the credits.
- The original package is approximately 6.1 MB and contains 531 mesh pieces. Mobile uses a lower pixel ratio and smaller shadow maps, but performance still depends on the device. Geometry is preserved without batching animated model parts.
- BigHero.zip contains [Armored Baymax by DoodleNotes1](https://www.blendswap.com/blends/view/76636). Its supplied license states CC BY 3.0 and marks the model as noncommercial fan art. The original license is retained alongside the GLB and credited in the field guide.
- Baymax's Blender model was converted to a self-contained GLB (about 3.7 MB) with four textures and its skeleton. The source contains no animation clips; simple Idle and Walk clips were added. Running speeds up the walk, and jumping uses the game's existing movement. Surface subdivision is limited to one level; unused facial shape keys are omitted. The temporary explorer remains as a loading/error fallback.
- To reproduce the conversion with Blender 4.5, extract BigHero.zip, then run `blender -b -Y --python scripts/export-bighero.py -- /path/to/extracted/BigHero public/play-assets/bighero/character.glb`. `-Y` disables embedded Python from the source file. Gestalt and the Tripo character are not included.

Run checks with `node --test test/play.test.mjs test/play-sound.test.mjs test/play-character.test.mjs` and `npm run build`.
