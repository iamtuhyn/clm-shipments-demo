# CLM · Shipments module — front-end demo

A clickable front-end of the CLM **Shipments** module, built on the Amlog design system.
It's plain HTML, CSS and JavaScript: no build step, no backend. All data lives in the browser (`localStorage`).

- Demo "today" is **25.10.2026**. All dates are in 2026.
- Site: Augustana College · Bradly Construction Project.
- Avatar menu (top right) → **Reset demo data** restores the original data before or after a demo.

## Run it locally

```bash
cd clm-shipments-demo
python3 -m http.server 8080
```

Open http://localhost:8080.

## Share it live

### Option A: GitHub Pages (permanent link)

1. On github.com, create a new **empty** repository, for example `clm-shipments-demo`. Don't add a README.
2. In this folder, run:
   ```bash
   git remote add origin https://github.com/<your-user>/clm-shipments-demo.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**. Set the source to *Deploy from a branch*, then pick `main` and `/ (root)`. Save.
4. After about a minute the demo is live at `https://<your-user>.github.io/clm-shipments-demo/`.

A **public** repository is visible to anyone. If the client data is sensitive, use a private repository (Pages for private repositories needs a paid GitHub plan), or use Option B.

### Option B: Netlify Drop (fastest, no account needed to start)

1. Go to https://app.netlify.com/drop.
2. Drag the whole `clm-shipments-demo` folder onto the page.
3. You get a link right away. Create a free account to keep the link permanently.

## Demo script (about 10 minutes)

1. **Shipments hub (Timeline)**
   - Expand *Erne Bauunternehmung*: shipments appear as bars on their day, coloured by status, max 5, then *Show all*.
   - Hover the ⓘ icon to see the status legend.
   - Status chips are multi-select. Try Overdue + Active.
2. **Properties** (⚙): change the time period, hide completed items, and choose which columns are visible.
3. **List and Cards views**. Use *Group by* to switch between Working package, Destination, Sender and Recipient. Live search highlights matches.
4. Click a **working package** to open its page:
   - KPI tiles filter the table.
   - Add, edit or duplicate shipments, mark as completed, and more.
5. Click shipment **908-Team pRED** to open the details page:
   - Change the status (Approve, with equipment confirmation) and use Undo.
   - Post a comment.
   - Try the Documents & photos, Annotations and Activity tabs.
   - Open **Manage**: Edit, Duplicate, Save as template, Cancel.
6. **Create → Create shipment**: pick a template or start from scratch, then go through the 5 steps and the Overview.
   - Weather day cards and the express rule.
   - Material quantity dialog.
   - Recommended vehicle.
   - Time slot: drag the bar or pick cells in the grid.
   - Equipment.
   - Person picker.
   - Finish with *Shipment created* → **Approve**.
7. **Create → Create working package**: a compact form with validation.
8. **Create → Upload working packages (Excel)**:
   - Upload any `.xlsx` file. The demo simulates 12 rows, 2 of them with errors.
   - Fix the errors inline, then import. The upload history updates.
   - *Download sample file* gives a real CSV. Upload it to see real parsing.

## Notes

- Only the Shipments module is interactive. Other menu items show "Not part of this demo".
- Uploaded files never leave the browser. Excel (.xlsx) parsing is simulated; CSV is parsed for real.
- Icons are the CLM custom icons (vehicles, equipment, statuses, legend), exported from Figma into `assets/js/icons-clm.js`. Raw SVGs are in `assets/icons/svg`.
- Fonts (Roboto, Material Symbols) load from Google Fonts, so the demo needs internet.
