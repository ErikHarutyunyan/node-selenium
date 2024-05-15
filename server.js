const express = require("express");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const Papa = require("papaparse");

const loginAndDownload = require("./scrap");

const app = express();
const port = 3000;
const downloadPath = path.resolve(__dirname, "downloads");
const extractPath = path.resolve(__dirname, "extracted");


function findLatestCsvFile(callback) {
	fs.readdir(extractPath, (err, files) => {
		if (err) {
			return callback(err);
		}
		const csvFiles = files
			.filter(file => file.endsWith(".csv"))
			.sort(
				(a, b) =>
					fs.statSync(path.join(extractPath, b)).mtime -
					fs.statSync(path.join(extractPath, a)).mtime
			);
		if (csvFiles.length > 0) {
			callback(null, csvFiles[0]);
		} else {
			callback(new Error("No CSV file available."));
		}
	});
}


app.get("/inventory", (req, res) => {
	findLatestCsvFile((err, file) => {
		if (err && err.message === "No CSV file available.") {
			console.log("No CSV file found, initiating download...");
			loginAndDownload()
				.then(() => {
					console.log("Download and extraction completed. Sending CSV file...");
					findLatestCsvFile((err, file) => {
						if (err) {
							res
								.status(500)
								.send("Error after downloading and extracting file.");
						} else {
							// res.sendFile(path.join(extractPath, file));
							sendCsvFile(res, path.join(extractPath, file));
						}
					});
				})
				.catch(error => {
					console.error("Error during download and extraction:", error);
					res.status(500).send("Failed to download and extract file.");
				});
		} else if (err) {
			res.status(500).send("Error reading files.");
		} else {
			// res.sendFile(path.join(extractPath, file));
			sendCsvFile(res, path.join(extractPath, file));
		}
	});
});

function sendCsvFile(res, filePath) {
	const fileContent = fs.readFileSync(filePath, "utf8");

	const result = Papa.parse(fileContent, {
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
	});

	const csvOutput = Papa.unparse(result.data, {
		quotes: false,
		quoteChar: '"',
		escapeChar: '"',
		delimiter: ",",
		header: true,
		newline: "\r\n",
	});

	res.type("text/plain").send(csvOutput);
}

cron.schedule("0 0,12 * * *", () => {
	console.log("Scheduled download starting...");
	loginAndDownload()
		.then(() => {
			console.log("Scheduled download completed.");
		})
		.catch(error => {
			console.error("Error in scheduled download:", error);
		});
});

app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
