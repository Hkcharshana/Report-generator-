# NeoSys Local Medical Report Generator

This is a small local web app based on the attached NeoSys Medicare Medical Lab form.

## Run

### Using Node.js directly:
```bash
cd neosys-local-generator
npm install
npm start
```

### Using Docker:
```bash
docker build -t neosys-local-generator .
docker run -p 1516:1516 neosys-local-generator
```

### Using Docker Compose:
```bash
docker compose up -d --build
```

Open `http://localhost:1516`.

## Features

- Patient details, registration details, notes and all lab fields found in the attached code
- Medical history rows with add/remove controls
- Browser localStorage persistence
- Demo data button for quick testing
- Word export as `.docx` with A4 page size
- Excel export as `.xlsx` with A4 portrait print setup, fit-to-width and wrapped cells
- Excel export uses the supplied `FBS.xlsx` worksheet design as a template: same 11-column grid, merged cells, fonts, row spacing, borders, signature block and report layout; each export creates one sheet named with the reference number
- PDF export as a one-page A4 laboratory report matching the supplied `04444.pdf` design, including the NeoSys artwork, patient summary, result table, method note, signature block and footer
- PDF fields for test name, result, reference range, specimen, issued time, method and result note
- Supported test selector: `FBS`, `RBS`, `Total Cholesterol`, `SGPT`, `SGOT`, `SGPT & SGOT`, `Total Bilirubine`, and `Serum Creatine`; results and reference ranges auto-fill from the matching lab fields
- Entering a reference number auto-loads only the report summary fields: Ref. No, PP/NIC No, Name, Age, Sex, Referred By, Date, Specimen and Report Issued Time. The attached `04444.pdf` record and all matching records in `FBS.xlsx` are available locally.
- Does not require the original NeoSys server/API; it runs locally

## Public sandbox preview

During this session the app is available at the generated sandbox URL shown in the task response. For a normal local computer, use `http://localhost:1516`.

## Simple report workflow

1. Enter a Reference No. such as `04444` and click **Search patient**.
2. The summary fields load from the local reference records.
3. Select one test: FBS, RBS, Total Cholesterol, SGPT, SGOT, SGPT & SGOT, Total Bilirubine or Serum Creatine.
4. Enter the result.
5. Review the report preview.
6. Download the matching A4 PDF or FBS-template Excel report.

No login is required in this local version.

## Latest fixes

- The PDF generator now keeps the complete NeoSys letterhead/logo/title visible and only clears the sample body.
- Reference lookup now accepts worksheet names and normalized reference numbers, including leading-zero references such as `04132`, `04109`, `03864` and `03535`.

## Local login screen

The app now opens with a username/password screen. Enter any non-empty username and password to open the local report generator. This is a local access gate only: credentials are not sent to NeoSys and are not stored on the server. Once inside, use the normal Search patient → Select test → Preview → Download PDF/Excel workflow.

## Browser bridge for live NeoSys records

The live NeoSys search endpoint is protected by the site's browser session and CORS policy, so the local server cannot call it directly. The app now supports a browser bridge. Open the local app and expand **How to connect live NeoSys search**; copy the bridge script, open the logged-in NeoSys Medical Lab tab, paste the script in that page's browser console, and leave that tab open. When an unknown reference is searched in the local app, the bridge reads the pending reference from the local app, calls NeoSys `/sys/find` using the authenticated browser session, and pushes only the selected patient summary back to the local app. Passwords and session cookies are never stored by the local server.

## Reference formats and multiple matches

The live search accepts full references such as `MRD26/04451` and partial queries such as `MRD26/044`. If a partial query returns more than one NeoSys patient, the local app shows a patient/reference/passport/date selection list; choose the correct record and click **Use selected** before entering the test result.

## Matching the supplied original search code

The browser bridge now follows the supplied search logic: an exact reference match is selected automatically; a partial query returns every matching NeoSys row; the local app displays all results with reference, name, passport and date; the user selects one row before report generation.

## Gender-based report name prefix

When the selected patient gender is Male, the report name is normalized to use `Mr.`. When the gender is Female, it uses `Ms.`. Existing prefixes such as Mr., Mrs. or Ms. are removed first to avoid duplicates. The rule is applied in the on-screen preview and PDF, Excel and Word exports.

## Generated report date and time

`Report Issued Time` is now generated at the moment PDF, Excel or Word export is requested; any old time from the patient record is ignored. Dates are displayed in long format such as `13 October 2026`.

## Age display

Patient age is normalized with a `Years` suffix. For example, `34` is shown as `34 Years` in the preview, PDF, Excel and Word exports, without duplicating the suffix when the source already includes it.

## Signature and result units

The supplied signature image is included in generated PDF, Excel and Word reports. Test units are automatically applied: FBS/RBS/Total Cholesterol/Bilirubine/Creatine use `mg/dL`, and SGPT/SGOT use `IU/L`. The unit is shown beside the entered result, such as `98 mg/dL`.

## Strict login gate

The report generator remains hidden until the login form is submitted with a non-empty username and password. No localStorage session bypass is used, so a refresh returns to the login screen. After successful login, the report generator becomes visible.

## Search reliability update

Known local references search immediately. For live NeoSys references, the app now checks whether the browser bridge heartbeat is active before queueing a search. If the bridge is not running, it stops immediately with a clear message instead of waiting silently. Keep the logged-in NeoSys Medical Lab tab open with the latest `bridge.js` running, then search from the local app tab.

## Long patient names

Long patient names in the A4 PDF are wrapped across two lines in the left details column so they do not overlap the right-side PP/NIC, Age, Referred By and Specimen fields. Excel name cells use wrapping and fit-to-cell settings as well.

## Report typography and confirmation note

The A4 PDF report body uses Times New Roman at 12pt. The `[Repeated and Confirmed]` result note and `**End of Report**` are centered. Long-name and right-column spacing is adjusted for the larger font.

## Readability and saved filenames

The PDF result value is bold for clearer reading, while the centered confirmation note remains prominent. Downloads use the reference and test name: for example `MRD26-04451_FBS.pdf` and `MRD26-04451_SGPT-SGOT.xlsx`.

## Complete long-name rendering

The PDF no longer limits a patient name to two lines. Every name segment is retained and wrapped across as many lines as needed, with the following left-column fields moved down accordingly.

## Initials and dynamic result section

Patient names are displayed in initials format with the last word retained, for example `Ms. W.A.A.S. Neshadi`. The result/test section now starts below the full patient-details block, so long names cannot overlap the test table, confirmation note, method or end-of-report text.

## Cambria typography

PDF, Excel and Word report outputs now use Cambria styling at 12pt. The PDF embeds the bundled Cambria-compatible Caladea font to keep the appearance consistent without requiring a local Microsoft font installation; Excel and Word declare the font family as Cambria.

## Final PDF spacing

PDF body text is now 11pt. `Report Issued Time : 9:41 AM` is rendered on one line, and the patient details begin with only a single-row gap below the Laboratory Report heading. The result/test block remains below the patient details without overlap.

## Issued-time alignment and heading spacing

The PDF now keeps `Report Issued Time : [time]` on one aligned line with the other patient fields. The gap below the Laboratory Report heading was increased slightly for readability.

## Preview-style alignment

The PDF now matches the preview: issued time is one text line, and the Test, Result and Reference Range headings plus their values are centered within their columns.

## Increased heading whitespace

The whitespace below the Laboratory Report heading was increased by one additional row so the patient details and result section are visually separated while maintaining the A4 layout.
"# Report-generator-" 
