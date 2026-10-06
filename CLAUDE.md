# Darkinsider — portfolio website

Personal portfolio of **Illia Vereshchuk** — cinematographer, director and editor based in Munich
(studies Filmmaking B.A. at Macromedia University of Applied Sciences, Munich; works freelance under the name **Darkinsider**).

**Talk to Illia in Ukrainian.** All website copy is in English.

The site was designed and built step by step in a long chat with Claude. Everything below is the result of
many explicit decisions by Illia. **Do not "redesign" or simplify things that are listed here as decided.**
When asked for a change, make targeted changes and keep the rest working.

---

## 1. Current state of the code

Static site, no build step, no framework. Plain `<script>` tags (no modules), loaded in this order at the end of `<body>`:
- `index.html` — markup only (all sections, inline SVGs, overlays).
- `css/main.css` — all styles (the small reduced-motion override stays inline in `<head>`).
- `js/projects.js` — `MODES`, `projects` (placeholder data) and the About panel HTML → `DK.MODES`, `DK.projects`, `DK.ABOUT_HTML`.
- `js/shaders/fluid.js` — GLSL as JS strings: vertex shader + fluid passes + the `show` pass with all logo materials → `DK.shaders`.
- `js/liquid.js` — `liquidReveal()` (WebGL2 fluid reveal) and its fallback `revealField()` → `DK.liquidReveal`, `DK.revealField`.
- `js/main.js` — everything else (intro, work carousel, focus ring, finale, smooth scroll, overlays, sound, clock).
- `window.DK` is the only shared global; each file keeps its own closure.
- `assets/materials/` — photographed logo materials used as WebGL textures (`puffer.webp`, `grass.webp`),
  cut out from the reference renders in `assets/materials/references/`.
- `assets/brand/` — logo files (SVG, outlined text), favicon, OG image, apple-touch icon.
- `assets/video/`, `assets/images/projects/`, `assets/images/about/`, `assets/fonts/` — empty, waiting for real media.

**Run it through a local server**, not by double-clicking: WebGL can't load textures from `file://`.
```
python3 -m http.server 8000   # then open http://localhost:8000
```
If the material textures can't load, the site falls back to procedural materials (no crash).

### First refactor — done
`index.html` was split into the files above without changing behaviour (verified section by section
against the single-file version in Chromium). Keep it a static site (hosting is plain webspace, no Node on the server).

---

## 2. Brand

- Name: **Darkinsider** (one spelling everywhere; "DarkinsideRR" and other spellings are retired).
- Logo: a solid **D** with a horizontal opening in cinemascope ratio (2.39:1) and a **red REC dot**.
  SVG path (viewBox 0 0 100 100):
  `M15 10 H50 C75 10 90 28 90 50 C90 72 75 90 50 90 H15 Z M30.1 40 H77.9 V60 H30.1 Z` (evenodd),
  dot: `circle cx=72 cy=25 r=3.7` (was reduced by 20% on Illia's request; brand-asset PNGs still use r=4.4).
- Colours: Midnight `#070A12` / ink `#05070D` (backgrounds), Ice `#E6ECF5` / `#F4F5F7` (logo, text),
  Steel `#8FA3C2` (secondary text), REC red `#E8201A` (only for the dot). Navy accents `#0A1226`.
- Fonts: **Archivo** (variable, condensed `font-stretch:62%`, weight 300, uppercase for big display titles; normal width for body),
  **Jost** (only for the DARKINSIDER wordmark and the projection text). Currently loaded from Google Fonts —
  **must be self-hosted before going live** (German GDPR case law on Google Fonts). Put the files in `assets/fonts/`.
- Style rules Illia asked for: premium, cinematic, dark, editorial, lots of negative space.
  **No generic "AI/template" look**: no pill buttons (text links with a hairline instead), no generic SaaS sections.

---

## 3. Page flow (top to bottom)

1. **Intro / landing** (`#intro`, sticky stage, scroll-driven)
   - Logo animation on load (~3 s): REC dot blinks once, D fades in, light turns on in the D's slot,
     the D glides left while a light beam (with drifting dust particles, canvas) grows out of the slot,
     a projection appears on the "wall" with DARKINSIDER / PRODUCTION, credit line below.
   - The slot light is semi-transparent (gradient), the beam's far end matches the projection height,
     projection edges are softly feathered.
   - Scrolling **zooms into the projection** until it fills the screen and the **showreel** appears (placeholder layer `#ireel`).
   - If the user does nothing, an **auto-zoom** starts 2 s after the intro (paused while the mouse is moving, cancelled by any input).
   - Landing composition is 30% larger than the original scene size (`k` in `renderIntro`).
2. **Work** (`#work`, sticky, scroll-driven horizontal carousel)
   - Left: a **focus ring** with the D in the middle (camera focus ring metaphor). Modes on an arc:
     Automotive, Short film, Image films, Events, About me. The ring turns **freely** (wheel/drag, with inertia);
     the active mode is the one closest to the pointer; films are **blurred by how far the ring is from a mark**
     and the label turns white only at perfect focus. Caption: "Focus to choose a project" (bottom of the column).
   - Right: project cards (16:9, title over the frame, client bottom-left, year bottom-right), moved right→left by vertical scroll.
     Cards away from the centre are slightly out of focus (rack focus).
   - "About me" mode shows the about panel instead of the carousel.
   - Project page = full-screen overlay with "Back to <mode>", browser back/Esc support (history state),
     "Next film" at the bottom.
   - On phones: ring on the left, cards (4:5) beside it; About uses the full width.
3. **Finale** (`#finale`, sticky, scroll-driven)
   - The film the user **rested on** in the carousel (≥350 ms pause, or the last opened film) fills the screen,
     then **zooms out** into the projection of the same D-projector scene as the landing (loop composition).
     The projection then shows DARKINSIDER / PRODUCTION. Same size as the landing.
   - "Have an interesting project?" with **Yes / No**. "No" runs away from the cursor (on touch it says
     "Are you sure?" / "Think about it once more" and turns into "Yes"). Yes reveals contacts.
   - Social links are always visible at the bottom.

Always on: fixed **REC + running timecode** under the header; **Munich local clock** in the work section;
film grain overlay; **smooth inertial wheel scrolling** (custom, mouse only; touch stays native);
fades between sections instead of hard cuts.

---

## 4. Liquid reveal effect (WebGL) — `liquidReveal()`

Concept (Illia's spec): the page has a hidden second layer; the mouse disturbs a thin layer of "ink in water"
and the hidden layer shows through, with **memory of the path**, organic ragged edges, velocity-dependent shape,
continuous trail, smooth dissipation. **Ragged, crisp edges like noth.in** (Illia chose this over soft edges).

- Real 2D fluid simulation on the GPU (stable fluids: advection, curl/vorticity, divergence, pressure Jacobi ×20,
  gradient subtract), ping-pong half-float textures. Requires WebGL2 + `EXT_color_buffer_float`;
  otherwise falls back to the older clip-path effect `revealField()`.
- Mouse → `splat()` along the whole segment since the last frame (no gaps), velocity-scaled.
- Mask = dye density through a sharp, noise-wavering threshold (`th = 0.24`).
- Hidden layer = negative of the scene painted into a 2D canvas (`paintLayer2`) + the **logo in another material**.
- Active only on the landing (before the zoom) and on the finale; disabled on touch devices and with reduced motion.

**Tuning parameters (current values are Illia's latest decisions):**
| What | Where | Value |
|---|---|---|
| Size of the reveal | `radius` in `splat()` (variance; linear size ∝ √radius) | dye `(0.00055 + spd*0.0011) * 0.49 * 0.49 * rand`, velocity `(0.0007 + spd*0.0012) * 0.49 * 0.49` (two −30% steps) |
| How long it stays | dye dissipation in `stepSim()` | `Math.exp(-0.86 * dt)` (two −30% steps from 0.42) |
| Simulation keep-alive after last move | `frame()` | `2800 ms` |
| Material cycle | `frame()` | `period = 2.6 s`, crossfade 0.45 s |

### Logo materials (index → material), cycled in the reveal
0. **Plush** — baby blue, long soft fibres, fuzzy silhouette (procedural).
1. **Pink cake** — frosting with pores and gloss, sponge side wall, colourful sprinkles with shadows (procedural).
2. **Ivory puffer jacket** — **photo texture** `assets/materials/puffer.webp`.
3. **Clear soap bubbles** — three sizes, refraction of the background, Fresnel rims, highlights (procedural).
4. **Clear inflatable vinyl** — refractive thick tube with seams (procedural).
5. **Natural grass** — **photo texture** `assets/materials/grass.webp` (letter body solid, blades only outside).

Removed on request: crumpled aluminium foil, the old procedural grass, pink balloon.

Procedural materials share: SDF of the D (`sdD`), extruded side wall (`sideHit`), soft shadow (`shadowAt`),
studio lighting (`studio()`, key light top-left + strip light right), GGX highlights, per-material red dot (`recDot`).

**Photo materials:** `photoMat()` maps the texture onto the D using a core box (`MAP_P`, `MAP_G` =
[u0, u1, v0, v1] of the letter inside the texture) → D units x 15..90, y 10..90.
Illia's long-term wish: **all materials photorealistic** by using renders of his exact logo
(he generates them, e.g. with an image model). To add one: cut out the dark studio background into an RGBA
WebP (decontaminate edges from the dark background), measure the letter's core box, add a sampler + map,
and route its material index to `photoMat`. The generated renders are slightly wider than the real D —
ideally regenerate them strictly from the real logo proportions.

---

## 5. Content (mostly placeholders)

- Projects: placeholder entries in the `projects` array (title, mode, cat, year, still class, role, client, text).
  Categories: `automotive`, `short`, `image`, `events`. Real projects, stills and videos still to come from Illia.
- Showreel: placeholder animation (night road with headlights). Plan: short silent MP4 loops on the site
  (10–30 s, 1080p, a few MB each) for the showreel in the projection and card previews;
  full films and the showreel with sound via **Vimeo** embeds on the project pages / "Watch the reel".
- About text: written from what Illia shared (Munich, Darkinsider, Macromedia, automotive focus, short/image/event films);
  portrait is a placeholder. Credits block: Directed by / Director of photography / Edited by / Colour — Illia Vereshchuk.
- Contacts (shown after "Yes"): **darkinsidercontact@gmail.com**, **+49 151 26 8897 50**.
- Socials: Instagram `darkinsider_prod`, TikTok `darkinsiderr` (taken from the old site — **confirm with Illia**);
  YouTube and LinkedIn links still missing.
- Legal: **Impressum and Datenschutzerklärung are required** (Germany, freelancer) — currently placeholder overlays.
  Texts to be generated (e.g. e-recht24.de); privacy text must cover hosting, Vimeo embeds, local fonts, email/phone links.

---

## 6. Hosting & deployment

- Domain: **darkinsider.de** (registered at a German hosting provider, together with a **Webspace-Paket M**).
  GitHub Pages is not used.
- Deploy = upload the static files to the webspace root (file manager or SFTP/FTP). Enable SSL (https) for the domain.
- Keep large films off the webspace (Vimeo); keep loops/stills compressed.

---

## 7. Next steps (suggested order)

1. ~~Refactor into files (see §1) — no visual changes.~~ Done.
2. Self-host the fonts (Archivo variable + Jost) in `assets/fonts/`.
3. Real content: project data, stills (`assets/images/projects/`), video loops (`assets/video/`), portrait, links.
   Make the cards/project pages pick up real images/videos by filename, with the current placeholders as fallback.
4. Impressum + Datenschutz pages (real pages, linked in the footer).
5. Performance pass on real hardware (desktop GPU 60 fps for the liquid effect; mobile without it).
6. Meta tags, OG image, favicon set (already in `assets/brand/`).
7. Deploy to the webspace and test on desktop + phone (iOS Safari, Android Chrome).

Brand asset packs (avatars, banners, YouTube/LinkedIn formats) were delivered separately as `Darkinsider_Brand_Assets.zip`.
