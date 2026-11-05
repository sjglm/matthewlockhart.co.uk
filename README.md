# Matthew Lockhart's portfolio

A static portfolio with no build step or runtime dependencies. `index.html` contains all content, `styles.css` controls the responsive layout, and `script.js` provides the native image galleries.

## Preview

From this directory:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765. The existing `CNAME` is retained for the custom domain; local changes are not automatically published.

## Add the new project photos

Drone Defence, Ossuary and King's Game currently use styled placeholders. Add photos under `Assets/` and replace the relevant `<div class="project-media project-placeholder ...">...</div>` in `index.html` with:

```html
<div class="project-media">
  <img src="Assets/your-project-image.jpg"
       alt="Describe what the project screenshot shows."
       width="800" height="450" loading="lazy" decoding="async">
</div>
```

For a gallery, follow one of the existing game cards: give the cover link and additional hidden links the same unique `data-gallery` value and add a `data-caption` to each. Update the visible image count and cover's accessible label. Gallery images load on demand, and the cover remains a normal image link without JavaScript.

## Content

- Experience combines the supplied general and game development CVs, with the current BAE Systems Air role beginning in August 2026.
- Both current CV PDFs are in `Assets/`; the older PDF remains available at its existing path.
- There are 15 projects. Gold Rush was removed at the owner's request; its image files remain in `Assets/`.
- Games are ordered: So You Think You Can Talk?, Black Tide: Forsaken, Drone Defence, Ossuary, King's Game and Enter the Dungeon.
- So You Think You Can Talk? links to its Steam store page and is labelled "Coming soon on Steam". Its gallery contains the official promotional header and five store screenshots, downloaded locally from Steam on 5 November 2026. Original source URLs are recorded in `Assets/SYTYCT-ASSETS/sources.json`.
- The globe project is described as an internal sales visualisation tool, without assertions about legal compliance or customer tracking.
- Dot2. directorship covers business strategy, product design, supplier negotiations, Amazon listings, pricing, marketing and operations, alongside the website and internal tools. No start date or financial metrics have been inferred.
- Contact is the last content section, immediately above the footer; the Dot2. banner appears before Contact. Its logo is an unchanged copy of the SVG supplied by the owner (`Assets/Dot2-Logo.svg`); CSS crops the empty artboard margins for display.
- Education uses the same date/location and content columns as Professional experience, with no CV link in the section. It covers the University of Hull degree and A levels in Business (A), Economics (B) and Classical Civilisation (B), plus an EPQ (C), at Hill House School, Doncaster (September 2018 to July 2020). All school grades were supplied by the owner.
- Identify is the first software project. Identify, Meat-Man, Cloth Physics Simulation, Sudoku Solver and Capture the Flag are labelled as university projects.
- The Courses & qualifications section is ready for additional details. Replace its empty-state paragraph with course entries once titles, providers and completion dates are supplied; no courses have been invented.
- BAE Systems and University of Hull logos are not included: permission for this use has not been established. Employer and education names remain as text.
- The Dot2. Website card uses the supplied logo and links to `https://dot2.co.uk/`, verified live on 5 November 2026.
- So You Think You Can Talk? carries "Coming soon on Steam"; Black Tide, Drone Defence, Ossuary and King's Game carry "In development"; Enter the Dungeon is labelled "Deprecated". All projects and galleries remain available.
- The University of Hull entry uses the transcript's full degree title, Computer Science for Games Development. Its native expandable Modules & grades list includes 15 marked modules grouped by year and the ungraded Extra-Curricular Activities entry. Titles and marks were checked against the supplied transcript; the transcript itself is not included in the public site files.
- The visible yearly results are calculated credit-weighted module averages: Year 1 75.83%, Year 2 77.17%, Year 3 77.50%, and 76.83% across all 360 credits. Each year contributes 120 credits. The expanded tables also show simple module averages of 77.00%, 75.80% and 78.60%. Ungraded extracurricular activity is excluded. These calculations are not presented as an official final degree mark or a reconstruction of the University's classification rules.
- The globe card uses `Assets/Order-Globe-Visualiser.png`, conceptual artwork made with the built-in image generation tool. Its complete prompt and tool details are recorded in `Assets/Order-Globe-Visualiser.source.json`; it depicts generic pins rather than real order data.
