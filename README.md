# Malaysia Prayer Reminder - Visual Studio Code Extension

This was built to serve as a prayer time reminder in the hope of encouraging us to perform prayers at the beginning of its times. 

It uses the [**Waktu Solat API**](https://api.waktusolat.app/) and is written in **TypeScript**, inspired by a similar extension: [**Prayer Reminder**](https://marketplace.visualstudio.com/items?itemName=OmarAbdulRahman.prayer-reminder).

## Features

#### Prayer countdown
![Prayer countdown status bar](https://i.imgur.com/yIttlip.png)

#### No prayer left status
![No prayer left status bar](https://i.imgur.com/4tCPiLB.png)

#### Prayer time notification
![Prayer time notification](https://i.imgur.com/S3SAqa9.png)

#### Prayer reminder notification
![Minutes before prayer time reminder](https://i.imgur.com/3LPyKoU.png)

## Extension Settings

This extension contributes the following settings:

![Minutes before prayer time reminder](https://i.imgur.com/GfXWlQI.png)

* `myPrayerReminder.timer`: Enter the reminder timer.

* `myPrayerReminder.zone`: Select your prayer zone from the dropdown.

## Known Issues

* Zone of **'KTN02 Gua Musang (Daerah Galas Dan Bertam), Jeli, Jajahan Kecil Lojing'** will throw an error if selected as the API sends an empty array of prayer times for the area. 

I have submitted an issue for the API error, as for now this issue will remain error.

## Release Notes

### 1.0.0

Initial release

## Contributing

If you want to contribute to this project, your are most welcome to submit an issue or a pull request.

## Roadmap

 - [ ] Option to choose whether to always show the countdown in status bar or only after the reminder notification appear.

## Author

**Malaysia Prayer Reminder** © [Zubair Adham](https://github.com/atmahana).  
Authored and maintained by Zubair Adham.
