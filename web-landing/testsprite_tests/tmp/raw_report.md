
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** web-landing
- **Date:** 2026-07-04
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Create a shipment with live pricing and see it recorded
- **Test Code:** [TC001_Create_a_shipment_with_live_pricing_and_see_it_recorded.py](./TC001_Create_a_shipment_with_live_pricing_and_see_it_recorded.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the expediteur login is currently blocked by the application's rate limiter message and prevents proceeding to create a shipment.

Observations:
- The login page displays the message: 'Trop de tentatives. Réessayez dans 15 minutes.'
- The email field contains 'tech@test.tn' and the 'Se connecter' action was attempted, but no successful login occurred due to the rate-limit message.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/c4b91e56-f5fa-4468-bf65-9209c61a1c7d
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Create a shipment successfully
- **Test Code:** [TC002_Create_a_shipment_successfully.py](./TC002_Create_a_shipment_successfully.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/12a58155-8e90-43fe-b177-20d74fc4c7d0
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Login as expediteur and reach the shipment workspace
- **Test Code:** [TC003_Login_as_expediteur_and_reach_the_shipment_workspace.py](./TC003_Login_as_expediteur_and_reach_the_shipment_workspace.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/9e11e76c-3f96-4fbf-83f1-8499b3164ba9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Progress a delivery through successful completion
- **Test Code:** [TC004_Progress_a_delivery_through_successful_completion.py](./TC004_Progress_a_delivery_through_successful_completion.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the UI prevents logging in due to rate limiting.

Observations:
- The login page displays the banner: 'Trop de tentatives. Réessayez dans 15 minutes.'
- The E-mail and Mot de passe fields are present but authentication is blocked by the rate limiter, preventing access to /livreur/jobs.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/39959e7a-fee4-49de-ad4b-dd298d4cf0f1
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Login as livreur and reach the delivery workspace
- **Test Code:** [TC005_Login_as_livreur_and_reach_the_delivery_workspace.py](./TC005_Login_as_livreur_and_reach_the_delivery_workspace.py)
- **Test Error:** TEST BLOCKED

The livreur sign-in could not be completed because the application blocked further login attempts with a rate limiter.

Observations:
- A red alert is displayed: "Trop de tentatives. Réessayez dans 15 minutes." on the login page.
- The E-mail field is populated with "skander@test.tn" and the password field is filled, but submission did not navigate to the livreur workspace.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/d3b46c23-4d2f-4929-995f-e7892e35eebf
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Receive a scanned shipment into the warehouse
- **Test Code:** [TC006_Receive_a_scanned_shipment_into_the_warehouse.py](./TC006_Receive_a_scanned_shipment_into_the_warehouse.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the dispatcher login is blocked by the backend rate limiter and authentication cannot proceed, preventing access to the reception scanning feature.

Observations:
- The page displays the error banner: "Trop de tentatives. Réessayez dans 15 minutes." above the login form.
- The dispatcher account (ali@djunoeli.tn) could not be authenticated, so navigation to the reception area and scanning cannot be performed.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/7e16de5b-6b51-4089-898c-48dd21f6c349
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Login as dispatcher and reach the warehouse workspace
- **Test Code:** [TC007_Login_as_dispatcher_and_reach_the_warehouse_workspace.py](./TC007_Login_as_dispatcher_and_reach_the_warehouse_workspace.py)
- **Test Error:** TEST BLOCKED

The dispatcher login could not be completed — the account is temporarily rate-limited and the UI prevents signing in.

Observations:
- The login page shows a red alert: 'Trop de tentatives. Réessayez dans 15 minutes.'
- The login form is visible with E-mail set to 'ali@djunoeli.tn' and a filled password field, but submitting did not navigate to a workspace.
- The 'Se connecter' button was clicked, however the application remained on the login screen and displayed the rate-limit message.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/ad2ac3b2-339e-4a01-935a-eb2c74f52a84
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Create a shipment with a live price estimate
- **Test Code:** [TC008_Create_a_shipment_with_a_live_price_estimate.py](./TC008_Create_a_shipment_with_a_live_price_estimate.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the application server is not responding and the expediteur login page is unreachable.

Observations:
- The browser shows an error page: "This page isn’t working" with ERR_EMPTY_RESPONSE.
- Only a "Reload" button is present; no login form or application UI is visible.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/5e9c97b4-e882-49d6-bfe3-cca862ccb7d9
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Filter invoices to unpaid and mark one as paid
- **Test Code:** [TC009_Filter_invoices_to_unpaid_and_mark_one_as_paid.py](./TC009_Filter_invoices_to_unpaid_and_mark_one_as_paid.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the UI does not provide selectable expeditor suggestions and no invoices exist to perform the payment flow.

Observations:
- The 'Expéditeur (ID)' input is present and set to a value, but the associated suggestions list (datalist 'exp-suggestions') contains 0 options.
- Attempts to generate invoices with explicit IDs produced a 'Données invalides' notice and did not create any invoices.
- The invoice list displays 'Aucune facture', so no unpaid invoice is available to open and pay.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/91736e4d-59dc-4000-80a5-6f3a1fc762e7
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Login as finance manager and reach the finance workspace
- **Test Code:** [TC010_Login_as_finance_manager_and_reach_the_finance_workspace.py](./TC010_Login_as_finance_manager_and_reach_the_finance_workspace.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/c7238432-71c8-4b2e-83fb-c95d40ecccb6
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Login as admin and reach the back-office workspace
- **Test Code:** [TC011_Login_as_admin_and_reach_the_back_office_workspace.py](./TC011_Login_as_admin_and_reach_the_back_office_workspace.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the admin account is temporarily rate-limited and the UI prevents further login attempts.

Observations:
- The login page displays a red alert: "Trop de tentatives. Réessayez dans 15 minutes." after submitting credentials.
- The page remained on the login screen (email and password inputs still visible) and the admin workspace did not load.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/f0465fa1-e8bb-4599-9483-86656bcdc933
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Assign a scanned shipment to a driver
- **Test Code:** [TC012_Assign_a_scanned_shipment_to_a_driver.py](./TC012_Assign_a_scanned_shipment_to_a_driver.py)
- **Test Error:** TEST BLOCKED

The test could not be run because the dispatcher account is temporarily blocked by the server-side rate limiter.

Observations:
- The dispatch login page displays the error message: 'Trop de tentatives. Réessayez dans 15 minutes.'
- The email field shows ali@djunoeli.tn and the password was submitted, indicating the server rejected login attempts due to rate limiting.

Because authentication as the dispatcher cannot be completed, the subsequent steps (navigating to /dispatch/assignation, selecting a driver, scanning a tracking number, and verifying assignment) cannot be executed. Retry after the rate-limit window or use a pre-authenticated session for the dispatcher to continue testing.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/339a3f39-bdc5-4c4d-848a-27d4a61e6210
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Cancel a shipment from shipment detail as an admin
- **Test Code:** [TC013_Cancel_a_shipment_from_shipment_detail_as_an_admin.py](./TC013_Cancel_a_shipment_from_shipment_detail_as_an_admin.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the admin account is temporarily blocked by the backend rate limiter and login cannot be completed.

Observations:
- A visible red alert on the admin login page reads: 'Trop de tentatives. Réessayez dans 15 minutes.'
- The E-mail and Mot de passe inputs are present but submitting is blocked by the rate-limit message, preventing access to the admin UI (Shipments) needed to continue the test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/f6e2634f-e053-499d-a7cc-2cfa5612fe2b
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Generate an invoice for an expediteur
- **Test Code:** [TC014_Generate_an_invoice_for_an_expediteur.py](./TC014_Generate_an_invoice_for_an_expediteur.py)
- **Test Error:** TEST BLOCKED

The finance login is blocked by the application's rate limiter and the test cannot proceed to invoice generation.

Observations:
- The login page displays a red banner: 'Trop de tentatives. Réessayez dans 15 minutes.'
- The E-mail field is prefilled with 'farah@djunoeli.tn' and the password field is present, but signing in is prevented by the rate limiter.
- Without successful finance authentication, the invoice management UI cannot be reached to create or verify invoices.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/6b40092a-223c-4c7e-be23-46b0a81eb575
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Create an express fragile shipment with a higher estimate
- **Test Code:** [TC015_Create_an_express_fragile_shipment_with_a_higher_estimate.py](./TC015_Create_an_express_fragile_shipment_with_a_higher_estimate.py)
- **Test Error:** TEST FAILURE

The shipment creation did not complete or was not recorded.

Observations:
- The 'Mes livraisons' page shows the empty-state message 'Aucun colis pour le moment' (no shipments listed) after submission attempts.
- Two attempts to submit the shipment (submit SVG clicked, city 'Tunis' selected) produced no success confirmation or new entry in the shipments list.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9da9c6b-a060-47ae-afae-a2085471981c/52c7de59-6c99-4cd4-b4b8-a341b0626368
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **20.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---