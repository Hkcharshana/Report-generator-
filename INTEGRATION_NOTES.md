# NeoSys live integration findings

- User-provided service: https://neosys.lk/sys/medical-lab
- Authenticated browser session successfully loaded the medical-lab page.
- The page's search form uses a same-origin POST to `https://neosys.lk/sys/find` with form fields:
  - `search`: passport/reference query
  - `type`: `patient_doctor_report`
- Browser session test for query `04446` returned live patient JSON, including `passport_no`, `ref_no`, `fname`, `lname`, `gender`, `age`, `agency_name`, `reg_date`, `rbs`, `sgpt`, etc.
- Direct server-side requests are blocked by the site's anti-bot verification page.
- Cross-origin fetch from the local report app to the authenticated NeoSys endpoint failed with `TypeError: Failed to fetch` (CORS/session isolation).
- No configured official NeoSys API connector matched the requested service.
- To implement official API integration, obtain the official API base URL/documentation and authentication method. Do not place API secrets in chat; use a secure connector configuration.
