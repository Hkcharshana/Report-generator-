# NeoSys Local Generator - Backend

This directory houses the backend server, API routes, Erba H360 HL7 communication server, and report generation engines (Excel & PDF).

## Folder Structure
```
backend/
├── server.js         # Core backend Express server and HL7 MLLP listener
└── README.md         # Backend documentation and architecture guide
```

## Key Modules in `server.js`
1. **Environment Loader:** Parses the root `.env` file automatically to configure ports, credentials, and paths.
2. **HL7 MLLP Interface (Port 5600):** Bi-directional communication with the Erba Mannheim H360 Automated Hematology Analyzer.
3. **NeoSys Portal Integration:** Connects to both Pettah and Colombo branches for patient searches and session handling.
4. **Export Engines:**
   - **Excel:** Generates standard single-test `.xlsx` or multi-sheet workbooks for `Type 10 B` (4 sheets) and `Type 10 B with urine drug` (5 sheets).
   - **PDF:** High-resolution vector-rendered PDF reports with official letterhead, signatures, and stamps.
