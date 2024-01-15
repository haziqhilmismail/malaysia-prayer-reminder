import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';
import { capitalizeFirstLetter, getConfig, handleError, showPrayerReminder, showNotificationReminder, shouldShowNotification, getPrayerZone } from './utils';
import { calculateHoursMinutes, calculateTimeBefore, calculateTimeLeft } from './calculator';
import { POLL_INTERVAL, CURRENT_DATE, CURRENT_DAY, API_URL } from './constants';

type PrayerTime = Record<string, unknown>

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

		const url = API_URL + zon;
		const res = await axios.get(url)

		const dataYear = res.data.year;
		const dataMonth = res.data.month;
		const dataPrayersTime = res.data.prayers;

		const ignore = ['day', 'hijri', 'syuruk',];
		const prayerOrder = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

		if (!res.data) {
			handleError("Invalid API response. Check your prayer's zone configuration and reload the window")
		}

		for (let i = 0; i < dataPrayersTime.length; i++) {
			if (dataPrayersTime[i].day === CURRENT_DAY) {
				const filteredData = Object.fromEntries(
					Object.entries(dataPrayersTime[i])
						.filter(([key]) => !ignore.includes(key))
				);

				const reorderedData = Object.fromEntries(
					prayerOrder.map(key => [key, filteredData[key]])
				);

				return reorderedData;
			}
		}

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
	}
	return {};
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
		for (const [key, value] of Object.entries(prayerTimesData)) {
			prayersTiming.set(key, value);
		}

		for (const [key, value] of prayersTiming) {
			let timeLeft = 0;

			const timestamp = value * 1000;
			const prayerTime = new Date(timestamp);

			const hour = prayerTime.getHours();
			const minute = prayerTime.getMinutes();

			const timerDate = calculateTimeBefore(hour, minute, timer);

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
	const { timer } = getConfig();
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

		const timeLeft = prayersCountdown.get(nextPrayerName);

		if (shouldShowNotification(timeLeft, timer)) {
			showNotificationReminder(nextPrayerName, timer);
		}
``
		updateStatusBarText();
	}, POLL_INTERVAL);
};

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "malaysia-prayer-reminder" is now active!');

	// Initially update the maps
	updateMaps().then(() => updateStatusBarText());

	statusBarItem.show();

	updateStatusBarEveryMinute();

	let refresh = vscode.commands.registerCommand('myPrayerReminder.refresh', async () => {
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