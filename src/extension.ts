import * as vscode from 'vscode';
import axios from 'axios';
import { capitalizeFirstLetter, getConfig, handleError, showPrayerReminder, showNotificationReminder, shouldShowNotification } from './utils';
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

const fetchPrayerTimes = async (state: string, zone: string) => {
	try {
		const url = `https://waktu-solat-api.herokuapp.com/api/v1/prayer_times.json?negeri=${state}&zon=${zone}`
		const res = await axios.get(url)
		return res.data.data.zon[0].waktu_solat;
	} catch (error) {
		handleError(error)
	}
}

const updateMaps = async () => {
	prayersCountdown.clear();
	prayersTiming.clear();

	const { state, zone, timer } = getConfig();

	lastDay = CURRENT_DAY;

	const prayerTimesData: PrayerTime = await fetchPrayerTimes(state, zone);

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

	const textContent = hoursLeft === 0 ? `\$(watch) ${capitalizeFirstLetter(nextPrayerName)} in ${minutesLeft}m` : `\$(watch) ${capitalizeFirstLetter(nextPrayerName)} in ${hoursLeft}h ${minutesLeft}m`;
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