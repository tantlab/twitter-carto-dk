import { createLogger, format, transports } from "winston";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as d3 from 'd3';

export async function update_mp_list(date) {

	const targetDate = ((date === undefined)?(new Date() /*Now*/):(new Date(date))) 
	const year = targetDate.getFullYear()
	const month = (1+targetDate.getMonth()).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
	const datem = (targetDate.getDate()).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
	const thisFolder = `data/${year}/${month}/${datem}`

	// Logger
	// Inspiration: https://blog.appsignal.com/2021/09/01/best-practices-for-logging-in-nodejs.html
	const logLevels = {
	  fatal: 0,
	  error: 1,
	  warn: 2,
	  info: 3,
	  debug: 4,
	  trace: 5,
	};

	const logLevel = "info"

	const logger = createLogger({
		level: logLevel,
	  levels: logLevels,
	  format: format.combine(format.timestamp(), format.json()),
	  transports: [
	  	new transports.Console(),
	  	new transports.File({ filename: `${thisFolder}/01_update_mp.log` }),
	  ],
	});

	logger.info('***** RUN SCRIPT ****');
	console.log("Log level is", logLevel)
	logger.info('Log level is '+logLevel);

	// Load the source file settings
	let corpusSettings
	try {
		corpusSettings = JSON.parse(fs.readFileSync("corpus_settings.json", "utf8"))
		logger
			.info('Corpus settings loaded and parsed');
	} catch (error) {
		logger
			.error('The corpus settings file could not be loaded and parsed', error);
	}

	/**
	 * Downloads file from remote HTTP[S] host and puts its contents to the
	 * specified location.
	 */
	async function download(url, filePath) {
	  const proto = !url.charAt(4).localeCompare('s') ? https : http;

	  return new Promise((resolve, reject) => {
	    const file = fs.createWriteStream(filePath);
	    let fileInfo = null;

	    const request = proto.get(url, response => {
	      if (response.statusCode !== 200) {
	        fs.unlink(filePath, () => {
	          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
	        });
	        return;
	      }

	      fileInfo = {
	        mime: response.headers['content-type'],
	        size: parseInt(response.headers['content-length'], 10),
	      };

	      response.pipe(file);
	    });

	    // The destination stream is ended by the time it's called
	    file.on('finish', () => resolve(fileInfo));

	    request.on('error', err => {
	      fs.unlink(filePath, () => reject(err));
	    });

	    file.on('error', err => {
	      fs.unlink(filePath, () => reject(err));
	    });

	    request.end();
	  });
	}

	const sourceFileURL = corpusSettings.csv_url
	const sourceFileSave = `${thisFolder}/source_corpus.csv`
	const cleanFileSave = `${thisFolder}/twitter_handles.csv`

	logger
		.child({ context: {sourceFileURL, sourceFileSave} })
		.debug('Download source file');

	return download(sourceFileURL, sourceFileSave)
		.then(
			result => {
				logger
					.child({ context: {sourceFileURL, sourceFileSave} })
					.info('Source file downloaded');

				// Process source into a simpler file format
				logger
					.child({ context: {sourceFileSave, cleanFileSave} })
					.debug('Clean source file and save list of handles');
				try {
					// Load file as string
					const csvString = fs.readFileSync(sourceFileSave, "utf8")
					// Parse string and filter data
					const cleanData = d3.dsvFormat(corpusSettings.csv_separator).parse(csvString, (d) => {
						let h = d[corpusSettings.columns.handle]
						// Remove the @ if there is one at the beginning of the handle
						if (h.substr(0,1) == "@") {
							h = h.substr(1, h.length - 1)
						}
					  return {
					    handle: h,
					    name: d[corpusSettings.columns.name],
					    group: d[corpusSettings.columns.political_affiliation] || "Missing",
					  };
					});
					logger
						.child({ context: {sourceFileSave} })
						.info('Source file parsed');
					// Format filtered data as a string
					const outputCsvString = d3.csvFormat(cleanData.filter(d => d.handle.length>0))
					// Write clean file
					return fs.promises.writeFile(cleanFileSave, outputCsvString)
						.then(result => {
								logger
									.child({ context: {cleanFileSave} })
									.info('Clean file saved successfully');
								return {success:true, msg:"Clean file saved successfully."}
							}, error => {
								logger
									.child({ context: {cleanFileSave, error} })
									.error('The clean file could not be saved');
								return {success:false, msg:"The clean file could not be saved."}
							})
				} catch (error) {
					logger
						.child({ context: {sourceFileSave, cleanFileSave, error} })
						.error('The source file could not be parsed and saved');
					return {success:false, msg:"The source file could not be parsed and saved."}
				}

				console.log("Done.")
			},
	  	error => {
				logger
					.child({ context: {sourceFileURL, sourceFileSave, error} })
					.error('Failed to download source file');
				return {success:false, msg:"Failed to download source file."}

				console.log("Done (failed).")
	  	}
		)
}

// Command line arguments
// Date argument
let date = undefined
const dateArgRegexp = /d(ate)?=([0-9]{4}\-[0-9]{2}\-[0-9]{2})/i
process.argv.forEach(d => {
	let found = d.match(dateArgRegexp)
	if (found && found[2]) {
		date = found[2]
	}
})
// Auto mode (run the script)
if (process.argv.some(d => ["a","-a","auto","-auto"].includes(d))) {
	console.log("Run script"+((date)?(" on date "+date):("")))
	update_mp_list(date)
}