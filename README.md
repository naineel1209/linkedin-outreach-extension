# LinkedIn Peer Finder

LinkedIn Peer Finder adds LinkedIn and Google peer-search buttons to LinkedIn job-detail pages.

## Install a package

The `packages/linkedin-outreach-extension.zip` file contains the extension source.

1. Extract the ZIP file to an empty folder.
2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Select the extracted folder.

The `packages/linkedin-outreach-extension.crx` file has a signing key.

Google Chrome blocks direct CRX installation outside Chrome Web Store or managed enterprise policies.

Use the ZIP package for a local Chrome installation.

Keep the same signing key for every future CRX release.

Set GitHub secret `CHROME_CRX_SIGNING_KEY` to the complete PEM key content.

The extension also supports a selected job in LinkedIn search results.

The extension adds **Copy Company Name - Job link** beside the job actions.

This button copies the company name, job title, and job link as tab-separated values.

For Easy Apply jobs, it copies the canonical LinkedIn job URL.

For external application jobs, it copies the final external application URL.

The LinkedIn button searches for the current job title and company name.

The Google button searches public LinkedIn profile pages with the same title and company name.

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

9. Select **Find peers on Google**.

Chrome opens a Google search tab.

The Google search uses `site:linkedin.com/in/` with the job title and company name.

## Copy a company name and job link

1. Open a LinkedIn job-detail page or select a job in job search results.
2. Select **Copy Company Name - Job link**.
3. Paste into Google Sheets.

Google Sheets places the company name in one column.

Google Sheets places the job title in the next column.

Google Sheets places the job link in the third column.

The button shows **Copied** after a successful copy operation.

The button shows **Copy failed** when it cannot get the application URL or clipboard access.

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

The job buttons appear beside **Apply** when LinkedIn shows that action.

The job buttons appear beside **Save** when Apply is unavailable.

The job buttons appear below the job header when neither action exists.

Both peer-search buttons need a job title and a company name.

The copy button needs a company name and a selected job.
