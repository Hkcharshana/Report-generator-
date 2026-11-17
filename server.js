/**
 * ==============================================================================
 *  NEOSYS MEDICARE LOCAL GENERATOR - ROOT APPLICATION ENTRYPOINT
 * ==============================================================================
 *  This file acts as the universal entrypoint for the application, delegating
 *  all server operations, HL7 MLLP listeners, and APIs to the Backend module.
 *
 *  Frontend code: ./frontend (UI, styles, scripts, templates)
 *  Backend code:  ./backend  (Express APIs, HL7 MLLP server, Excel/PDF engines)
 * ==============================================================================
 */

require('./backend/server.js');
