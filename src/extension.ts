import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import { capitalizeFirstLetter, getConfig, handleError, showPrayerReminder, showNotificationReminder, shouldShowNotification, getPrayerZone } from './utils';
import { calculateHoursMinutes, calculateTimeBefore, calculateTimeLeft } from './calculator';
import { POLL_INTERVAL, CURRENT_DATE, CURRENT_YEAR, CURRENT_MONTH, CURRENT_DAY } from './constants';

type PrayerTime = {
	name: string,
	time: string
}[];

const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);

const prayersCountdown = new Map(),
	prayersTiming = new Map();

let nextPrayerName: string,
	lastDay: any,
	endOfDay = false;

const fetchPrayerTimes = async (): Promise<PrayerTime> => {
	try {
		const { zone } = getConfig();
		const zon = getPrayerZone(zone);

		const url = `https://waktu-solat-api.herokuapp.com/api/v1/prayer_times.json?zon=${zon.toLowerCase()}`
		const res = await axios.get(url)

		if (!res.data || !res.data.data[0]) {
			handleError("Invalid API response. Check your prayer's zone configuration and reload the window")
		} else if (res.data.data[0].waktu_solat.length === 0) {
			handleError("No prayer time available from the API response")
		}

		return res.data.data[0].waktu_solat;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError;

			if (axiosError.response) {
				handleError(`API Error: ${axiosError.response.status} - ${axiosError.response.statusText}`);
			} else if (axiosError.request) {
				handleError("Network Error: No response received from the server");
			} else {
				handleError(`Request Error: ${axiosError.message}`);
			}
		} else {
			handleError("Unable to fetch prayer times. Check your prayer zone configuration and reload the window");
		}
		return [];
	}
}

const updateMaps = async () => {
	prayersCountdown.clear();
	prayersTiming.clear();

	const { timer } = getConfig();

	lastDay = CURRENT_DAY;

	const prayerTimesData = await fetchPrayerTimes();

	if (prayerTimesData.length === 0) {
		handleError("Unable to fetch prayer times. Check your prayer zone configuration and reload the window");
	} else {
		for (const [_, value] of Object.entries(prayerTimesData)) {
			prayersTiming.set(value.name, value.time);
		}

		for (const [key, value] of prayersTiming) {
			let [hour, minute] = value.split(':'), timeLeft = 0;
			const prayerTime = new Date(CURRENT_YEAR, CURRENT_MONTH, CURRENT_DAY, hour, minute);
			const timerDate = calculateTimeBefore(hour, minute, timer)

			if (CURRENT_DATE === timerDate) {
				timeLeft = calculateTimeLeft(prayerTime, timerDate);
			} else {
				timeLeft = calculateTimeLeft(prayerTime, CURRENT_DATE);
			}

			if (timeLeft > 0) {
				prayersCountdown.set(key, timeLeft);
			}
		}

		if (prayersCountdown.size === 0) {
			endOfDay = true;
			statusBarItem.text = '\$(watch) No prayers left today';
		}
	}
}

const updateStatusBarText = () => {
	if (endOfDay || prayersCountdown.size === 0) {
		statusBarItem.text = '\$(watch) No prayers left today';
		return;
	}

	const date = new Date();
	const day = date.getDate();

	if (day !== lastDay) updateMaps().then(() => updateStatusBarText());

	nextPrayerName = prayersCountdown.keys().next().value;

	const timeLeft = prayersCountdown.get(nextPrayerName);
	const { hours: hoursLeft, minutes: minutesLeft } = calculateHoursMinutes(timeLeft);

	const textContent = hoursLeft === 0
		? `\$(watch) ${capitalizeFirstLetter(nextPrayerName)} in ${minutesLeft}m`
		: `\$(watch) ${capitalizeFirstLetter(nextPrayerName)} in ${hoursLeft}h ${minutesLeft}m`;
	statusBarItem.text = textContent;

	if (hoursLeft === 0 && minutesLeft === 0) {
		showPrayerReminder(nextPrayerName);
	}

	if (prayersCountdown.size === 0) {
		statusBarItem.text = '\$(watch) No prayers left today';
	}
}

const updateStatusBarEveryMinute = () => {
	setInterval(async () => {
		const date = new Date();
		const day = date.getDate();

		if (endOfDay) {
			statusBarItem.text = '\$(watch) No prayers left today';

			if (day === lastDay) {
				return;
			}

			endOfDay = false;
			await updateMaps();
			updateStatusBarText();
			return;
		}

		// If the prayer has passed, delete it from the prayersCountdown map
		if (prayersCountdown.get(nextPrayerName) - POLL_INTERVAL < 0) {
			prayersCountdown.delete(nextPrayerName);

			// If no prayer left, mark end of the day
			if (prayersCountdown.size === 0) {
				endOfDay = true;
			}

		} else {
			prayersCountdown.set(nextPrayerName, prayersCountdown.get(nextPrayerName) - POLL_INTERVAL);
		}

		const timeLeft = calculateTimeLeft(prayersCountdown.get(nextPrayerName), CURRENT_DATE);
		if (shouldShowNotification(timeLeft, getConfig().timer)) {
			showNotificationReminder(nextPrayerName, getConfig().timer);
		}

		updateStatusBarText();
	}, POLL_INTERVAL);
};

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "malaysia-prayer-reminder" is now active!');

	// Initially update the maps
	updateMaps().then(() => updateStatusBarText());

	statusBarItem.show();

	updateStatusBarEveryMinute();

	let refresh = vscode.commands.registerCommand('myPrayerReminder.refresh', () => {
		updateMaps().then(() => updateStatusBarText()).then(() => {
			vscode.window.showInformationMessage("Malaysia Prayer Reminder: Refreshed");
		});
	});

	context.subscriptions.push(refresh);
}

export function deactivate() {
	vscode.window.showInformationMessage("Malaysia Prayer Reminder: Deactivated")
	statusBarItem.dispose();
}