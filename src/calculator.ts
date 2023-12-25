export const calculateHoursMinutes = (miliseconds: number) => {
	const hours = Math.floor(miliseconds / (1000 * 60 * 60));
	const minutes = Math.floor((miliseconds % (1000 * 60 * 60)) / (1000 * 60));

	return { hours, minutes };
}

export const calculateTimeBefore = (hours: number, minutes: number, duration: number) => {
	const prayerTime = new Date();
	prayerTime.setHours(hours, minutes, 0, 0);

	const newDate = new Date(prayerTime.getTime() - (duration * 60000));
	return newDate;
}

export const calculateTimeLeft = (prayerTime: Date, date: Date): number => {
	return prayerTime.getTime() - date.getTime();
};