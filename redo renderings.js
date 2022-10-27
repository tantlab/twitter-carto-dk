import { render_map_twitter } from "./10_render_map_twitter.js";
import { render_map_4k_no_labels } from "./11_render_map_4K_no_labels.js";
import { render_map_4k_top_labels } from "./12_render_map_4K_top_labels.js";
import { render_pol_heatmaps } from "./14_render_pol_heatmaps.js";

const startingDate = new Date("2022-08-16")
const endDate = new Date("2022-10-26")

let date = startingDate
const redraw = function(){
	let year = date.getFullYear()
	let month = (1+date.getMonth()).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
	let datem = (date.getDate()).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
	console.log(`\n\n# RENDER MAP TWITTER FOR ${year}-${month}-${datem} ##############################`)

	render_map_twitter(date)
		.then(() => {
			console.info("# RENDER MAP TWITTER DONE.")
		}, error => {
			console.error("# RENDER MAP TWITTER ERROR", error)
		})

		.then(() => {
			console.log("# NOW RENDER MAP 4K NO LABELS ####################")
			return render_map_4k_no_labels(date)
		})
		.then(() => {
			console.info("# RENDER MAP 4K NO LABELS DONE.")
		}, error => {
			console.error("# RENDER MAP 4K NO LABELS ERROR", error)
		})

		.then(() => {
			console.log("# NOW RENDER MAP 4K TOP LABELS ####################")
			return render_map_4k_top_labels(date)
		})
		.then(() => {
			console.info("# RENDER MAP 4K TOP LABELS DONE.")
		}, error => {
			console.error("# RENDER MAP 4K TOP LABELS ERROR", error)
		})

		.then(() => {
			console.log("# NOW RENDER POL HEATMAPS ####################")
			return render_pol_heatmaps(date)
		})
		.then(() => {
			console.info("# RENDER POL HEATMAPS DONE.")
		}, error => {
			console.error("# RENDER POL HEATMAPS ERROR", error)
		})

		.then(() => {
			date.setDate(date.getDate() + 1);
			if (endDate-date >= 0) {
				return redraw()
			} else {
				console.log("\n\n# DONE. ###############################")
			}
		})
}
redraw()

