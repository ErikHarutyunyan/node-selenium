require('dotenv').config();

const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const downloadPath = path.resolve(__dirname, "downloads");
const extractPath = path.resolve(__dirname, "extracted");

async function loginAndDownload() {

	let options = new chrome.Options();
	options.addArguments("--headless");
	options.addArguments("--disable-gpu");
	options.addArguments('--no-sandbox');
	options.addArguments('--disable-dev-shm-usage');

	options.setUserPreferences({
		"download.default_directory": downloadPath,
		"download.prompt_for_download": false,
		"download.directory_upgrade": true,
		"safebrowsing.enabled": true,
	});

	let driver = await new Builder()
		.forBrowser("chrome")
		.setChromeOptions(options)
		.build();

	try {
		await driver.get("https://www.pencarrie.com/login/");
		await driver
			.findElement(By.id("email"))
			.sendKeys(process.env.EMAIL);
		await driver.findElement(By.id("password")).sendKeys(process.env.PASSWORD);

		await driver.sleep(4000);
		let button = await driver.findElement(
			By.className("button narrow-margin-right narrow-margin-bottom s-1")
		);
		await driver.executeScript("arguments[0].click();", button);

		await driver.sleep(4000);
		await driver.get("https://phoenix.pencarrie.com/shopify/inventory.zip");

		await driver.wait(() => {
			const files = fs.readdirSync(downloadPath);
			return files.some(file => file.endsWith(".zip"));
		}, 30000);

		console.log("File downloaded successfully.");
		extractZipFile();
	} finally {
		await driver.quit();
	}
}

function extractZipFile() {
	try {
		const files = fs.readdirSync(downloadPath);
		const zipFile = files.find(file => file.endsWith(".zip"));
		if (zipFile) {
			const zip = new AdmZip(path.join(downloadPath, zipFile));
			zip.extractAllTo(extractPath, true);
			console.log("ZIP file extracted successfully.");
		} else {
			console.log("No ZIP file found to extract.");
		}
	} catch (error) {
		console.error("Failed to extract ZIP file:", error);
	}
}

module.exports = loginAndDownload;
