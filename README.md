# LinkedIn Peer Finder

LinkedIn Peer Finder adds a People search button to LinkedIn job-detail pages.

The extension also supports a selected job in LinkedIn search results.

The extension searches for the current job title and company name.

The extension does not send messages or connection requests.

The extension adds **Copy profile** beside each People search result action.

The extension also adds this button to individual profile pages.

LinkedIn controls when it shows Connect or Message.

For a Pending action, LinkedIn can hide the profile URL in the action.

The extension reads the visible person-name link in that result row first.

It copies a LinkedIn People search URL only when LinkedIn hides that profile URL.

## Start the extension

1. Open Google Chrome.
2. Open `chrome://extensions` in the address bar.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Select this project folder:
   `/home/naineel/projects/linkedin-outreach-extension`
6. Open a LinkedIn job-detail page.
7. Wait for the page header to load.
8. Select **Find peers at [Company Name]**.

Chrome opens a new LinkedIn People search tab.

## Copy a profile name and URL

1. Open a LinkedIn People search results page.
2. Find a People search result or open an individual profile page.
3. Select **Copy profile** beside Connect, Message, or More.
4. Paste into Google Sheets.

Google Sheets places the name in one column.

Google Sheets places the profile URL in the next column.

LinkedIn controls when it shows Connect or Message.

The extension does not send connection requests.

## Update the extension

1. Save the changed extension files.
2. Return to `chrome://extensions`.
3. Select the reload button for LinkedIn Peer Finder.
4. Refresh the LinkedIn job-detail page.

## Check the extension

The button appears beside **Apply** when LinkedIn shows that action.

The button appears beside **Save** when Apply is unavailable.

The button appears below the job header when neither action exists.

The button needs both a job title and a company name.
