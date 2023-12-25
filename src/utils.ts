import * as vscode from 'vscode';
import { POLL_INTERVAL } from './constants';

export function capitalizeFirstLetter(inputString: string) {
  if (typeof inputString !== 'string' || inputString.length === 0) return;

  const capitalizedString = inputString.charAt(0).toUpperCase() + inputString.slice(1);

  return capitalizedString;
}

export const getConfig = () => {
	const { state, zone, timer, countdown } = vscode.workspace.getConfiguration("myPrayerReminder");;
	if (!state || !zone || !timer || !countdown) {
		vscode.window.showErrorMessage('Malaysia Prayer Reminder: Incomplete configuration. Fill in all fields.');
		throw new Error('Incomplete configuration');
	} else {
		return { state, zone, timer, countdown }
	}
};

export const handleError = (error: any) => {
	vscode.window.showErrorMessage(
		'Malaysia Prayer Reminder: Error fetching prayer times. Check your settings and reload the window.'
	);
	console.error(error);
};

export const showPrayerReminder = (prayerName: string) => {
	vscode.window.showInformationMessage(`It's time for ${capitalizeFirstLetter(prayerName)} prayer`, "Ok");
};

export const showNotificationReminder = (prayerName: string, timer: number) => {
	vscode.window.showInformationMessage(`${capitalizeFirstLetter(prayerName)} prayer in ${timer} minutes`, "Ok");
};

export const shouldShowNotification = (timeLeft: number, timer: number): boolean => {
	const timeLeftForReminder = timeLeft - timer * 60000;
	return timeLeftForReminder >= 0 && timeLeftForReminder < POLL_INTERVAL;
};