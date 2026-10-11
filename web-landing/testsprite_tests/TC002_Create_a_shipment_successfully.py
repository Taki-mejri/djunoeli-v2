import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5173/admin/login")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the Expediteur login page (the 'Expéditeur' / Expediteur login screen).
        await page.goto("http://localhost:5173/expediteur/login")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the E-mail field with 'tech@test.tn', the Mot de passe field with 'TechZone2026', then click the 'Se connecter' button to submit the Expediteur login form.
        # vous@entreprise.tn email field
        elem = page.get_by_placeholder('vous@entreprise.tn', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("tech@test.tn")
        
        # -> Fill the E-mail field with 'tech@test.tn', the Mot de passe field with 'TechZone2026', then click the 'Se connecter' button to submit the Expediteur login form.
        # •••••••• password field
        elem = page.get_by_placeholder('••••••••', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("TechZone2026")
        
        # -> Fill the E-mail field with 'tech@test.tn', the Mot de passe field with 'TechZone2026', then click the 'Se connecter' button to submit the Expediteur login form.
        # Se connecter button
        elem = page.get_by_role('button', name='Se connecter', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Créer un envoi' link to open the new shipment creation page.
        # Créer un envoi link
        elem = page.get_by_role('link', name='Créer un envoi', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the 'Ville (gouvernorat)' dropdown so the city options are displayed.
        # Choisir la ville... Tunis Ariana Ben Arous... dropdown
        elem = page.locator('xpath=/html/body/div/div/div/div/form/div/div/div[2]/div[3]/select')
        await elem.click(timeout=10000)
        
        # -> Select 'Tunis' in the 'Ville (gouvernorat)' dropdown so the form's origin/destination is set and the UI can recalculate price.
        # Choisir la ville... Tunis Ariana Ben Arous... dropdown
        elem = page.locator("xpath=/html/body/div/div/div/div/form/div/div/div[2]/div[3]/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # -> Fill the recipient name, phone and package description, then locate the 'Valider et créer le colis' button on the page.
        # Ahmed Karoui text field
        elem = page.get_by_placeholder('Ahmed Karoui', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Ahmed Karoui")
        
        # -> Fill the recipient name, phone and package description, then locate the 'Valider et créer le colis' button on the page.
        # +216 22 100 200 text field
        elem = page.get_by_placeholder('+216 22 100 200', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("+216 22 100 200")
        
        # -> Fill the recipient name, phone and package description, then locate the 'Valider et créer le colis' button on the page.
        # Ex: Smartphone iPhone 13 + chargeur, dans son... text area
        elem = page.get_by_placeholder("Ex: Smartphone iPhone 13 + chargeur, dans son emballage d'origine", exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Smartphone iPhone 13 + chargeur, dans son emballage d'origine")
        
        # -> Fill the 'Adresse complète' field with a valid address so the form can be submitted, then list all visible buttons to locate the 'Valider et créer le colis' CTA.
        # 12 Rue de Carthage, Immeuble Salem, Apt 3B text field
        elem = page.get_by_placeholder('12 Rue de Carthage, Immeuble Salem, Apt 3B', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("12 Rue de Carthage, Immeuble Salem, Apt 3B")
        
        # -> Click the 'Valider et créer le colis' button to submit the new shipment.
        # Valider et créer le colis button
        elem = page.get_by_role('button', name='Valider et créer le colis', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify a shipment creation confirmation is visible
        # Assert: The shipment creation confirmation 'Colis créé' is visible in the shipment details.
        await expect(page.locator("xpath=/html/body/div[1]/div/div/div/div[2]/div/div/div[3]").nth(0)).to_contain_text("Colis cr\u00e9\u00e9", timeout=15000), "The shipment creation confirmation 'Colis cr\u00e9\u00e9' is visible in the shipment details."
        # Assert: The new shipment's tracking number TRK-2026-00001 is visible, confirming the shipment was created.
        await expect(page.locator("xpath=/html/body/div[1]/div/div/div/div[2]/div/div/div[3]/div").nth(0)).to_contain_text("TRK-2026-00001", timeout=15000), "The new shipment's tracking number TRK-2026-00001 is visible, confirming the shipment was created."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    