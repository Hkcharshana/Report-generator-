# NeoSys Local Generator - Frontend

This directory contains the entire client-facing user interface, styling, assets, and browser-side bridge logic for the NeoSys Local Generator.

## Folder Structure
```
frontend/
├── index.html        # Main single-page application interface
├── app.js            # Client logic, state management, auto-selection, preview & exports
├── styles.css        # Clean, responsive medical dashboard stylesheet
├── bridge.js         # NeoSys live browser bridge automation script
└── assets/           # Fonts, stamps, signatures, and Excel report templates
    ├── type10b-template.xlsx  # Multi-sheet Excel template (10B & 10B with drug)
    ├── fbs-template.xlsx      # Standard single test Excel template
    ├── neosys-letterhead.jpg  # Medical letterhead background
    ├── signature.png          # Chief MLT official signature
    ├── h360-stamp-exact.png   # Blue laboratory stamp
    └── *.ttf                  # Embedded Cambria, Arial, and Times fonts
```

## Key Capabilities
- **Medical Package Auto-Selection:** Automatically detects `Type 10 B` and `Type 10 B with urine drug` from NeoSys patient data and activates corresponding package modes.
- **Bi-directional H360 Sync:** Automatically communicates with the Erba H360 machine on port 5600 for automatic test synchronization.
- **Live Preview:** Renders exact laboratory report previews before downloading.
