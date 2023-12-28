import * as assert from 'assert';
import * as vscode from 'vscode';

import { getPrayerZone, shouldShowNotification } from '../utils';
import { calculateTimeLeft } from '../calculator';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('getPrayerZone returns the first item of the area list', () => {
		const zone = "JHR04 - Batu Pahat, Muar, Segamat, Gemas Johor, Tangkak";

		const result = getPrayerZone(zone);

		assert.strictEqual(result, "Batu Pahat")
	});

	test('calculateTimeLeft returns correct time difference', () => {
		const prayerTime = new Date(2023, 0, 1, 12, 0, 0); // January 1, 2023, 12:00 PM
		const currentDate = new Date(2023, 0, 1, 11, 55, 0); // January 1, 2023, 11:55 AM

		const result = calculateTimeLeft(prayerTime, currentDate);

		assert.strictEqual(result, 5 * 60 * 1000) // 5 minutes in milliseconds
	});

	test('shouldShowNotification returns true when it\'s time to show the notification', () => {
		const timeLeft = 5 * 60 * 1000; // 5 minutes in milliseconds
		const timer = 5;

		const result = shouldShowNotification(timeLeft, timer);

		assert.strictEqual(result, true);
	});

	test('shouldShowNotification returns false when it\'s NOT the time to show the notification', () => {
		const timeLeft = 10 * 60 * 1000; // 10 minutes in milliseconds
		const timer = 5;

		const result = shouldShowNotification(timeLeft, timer);

		assert.strictEqual(result, false);
	});
});
