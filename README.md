# LifePrice

![LifePrice in action](./screenshots/screenshot.png)

## What is LifePrice?

LifePrice is a browser extension that converts price tags on websites into the equivalent amount of your working time. It helps you understand the true cost of purchases in terms of hours of your life spent earning that money.

## Installation

> **Note:** LifePrice is currently pending approval on the Chrome Web Store. In the meantime, you can install it manually.

### Manual Installation (Chrome/Edge)

1. Download or clone this repository to your computer
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension should now appear in your browser toolbar
6. Click the extension icon and enter your hourly wage in the settings

### Manual Installation (Firefox) - Not tested

1. Download or clone this repository to your computer
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to the extension folder and select any file (e.g., manifest.json)
5. The extension should now appear in your browser toolbar
6. Click the extension icon and enter your hourly wage in the settings

> **Coming Soon:** LifePrice will be available on the Chrome Web Store once approved.

## Features

- **Real-time Price Conversion**: Automatically detects and converts prices on any website
- **Works Everywhere**: Compatible with most online shopping sites, including Amazon
- **Customizable Display**: Personalize colors and message text to your preferences
- **Privacy Focused**: All your wage information is stored locally on your device, never sent to any servers

## How It Works

1. Set your hourly wage in the extension popup
2. Browse the web normally
3. See price tags automatically appended with time cost information (e.g., "$50 → 2.5 hrs of your life")

## Customization Options

LifePrice offers several ways to personalize your experience:

- **Toggle Message**: Turn on/off the descriptive text that follows the time
- **Custom Message**: Change "of your life" to any text you prefer
- **Color Settings**: Customize text color, background color, and border color

## Privacy

LifePrice respects your privacy:

- Your wage information is stored only in your browser's local storage
- No data is ever sent to our servers or third parties
- No tracking, analytics, or user identification

## Technical Details

- Lightweight with minimal performance impact
- Less than 50KB in size
- Works with Chrome, should work with Firefox, and Edge (not tested)

## License

[MIT License](LICENSE.md) - Feel free to use, modify, and distribute

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

---

**Created by vdotcodes**
