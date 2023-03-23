import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';

const GEORGIA_LOGIN_URL = 'https://gtc.dor.ga.gov/_/';

puppeteer.use(pluginStealth());

const nextSelector =
	'.ActionButton.ActionButtonNext.ActionButtonPosStep.ActionButtonStepNext.FastEvtExecuteAction';

let browserPromise: any;

try {
	browserPromise = puppeteer.launch({ headless: true });
} catch (e) {
	console.error(`failed to start pptr ${e}`);
}

export async function georgiaLogin(salesTaxId = '123456789') {
	const browser = await browserPromise;
	const page = await browser.newPage();

	await page.setRequestInterception(true);
	// @ts-ignore
	page.on('request', async (request) => {
		// Block All Images
		if (request.url().endsWith('.png') || request.url().endsWith('.jpg')) {
			await request.abort();
		} else {
			await request.continue();
		}
	});

	await page.goto(GEORGIA_LOGIN_URL);

	await page.deleteCookie(...(await page.cookies()));

	await page.waitForTimeout(2000);

	try {
		const ok = await page.waitForSelector('.FastMessageBoxButtonOk');

		await ok?.click();
	} catch {}

	await page.waitForTimeout(2000);

	const signup = await page.waitForSelector('.FGNVT.FGNVL.DFL.FastEvt');

	if (!signup) throw new Error('Failed to find "Sign Up"');

	await signup.click();

	await page.waitForTimeout(2000);

	const next = await page.waitForSelector(nextSelector);

	if (!next) throw new Error('Failed to find "Sign Up"');

	await next.click();

	await page.waitForTimeout(2000);

	const accountType = await page.waitForSelector('.FastSelect');

	if (!accountType) throw new Error('Failed to find "accountType"');

	await accountType.click();

	await page.waitForTimeout(2000);

	// IMPORTANT: page.select() does not work here, so pick option manually
	await page.keyboard.press('s');
	await page.keyboard.press('Enter');

	// await page.select('.DocControlCombobox', 'SLS');

	await page.waitForTimeout(2000);

	const next2 = await page.waitForSelector(nextSelector);

	if (!next2) throw new Error('Failed to find "Sign Up"');

	await next2.click();

	await page.waitForTimeout(2000);

	const finalField = await page.waitForSelector('.DocControlMask');

	if (!finalField) throw new Error('Failed to find "finalField"');

	finalField?.type(salesTaxId);

	await page.waitForTimeout(2000);

	return page.screenshot({ path: './example.png' });
}

// void georgiaLogin();