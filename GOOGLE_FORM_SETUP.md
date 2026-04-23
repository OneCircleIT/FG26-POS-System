# Google Form Integration Setup

To connect this POS system to a Google Form, follow these steps:

## 1. Create a Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new form
3. Add the following fields:
   - **Staff Name** (Short answer text)
   - **Total Amount** (Short answer text)
   - **Item Count** (Short answer text)
   - **Items** (Paragraph text)
   - **Timestamp** (Short answer text)

## 2. Get the Form URL

1. In your Google Form, click the "Send" button
2. Click the link icon (🔗)
3. Copy the form URL - it should look like:
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSdXXXXXXXXXXXXXXX/formResponse
   ```

## 3. Update the Code

1. Open `src/components/MainPage.js`
2. Find this line:
   ```javascript
   const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';
   ```
3. Replace `YOUR_FORM_ID` with your actual form ID from the URL

## 4. Get Entry IDs (Optional)

For more precise form submission, you can get the entry IDs:

1. In your Google Form, right-click and "Inspect Element"
2. Look for input fields with names like `entry.123456789`
3. Update the form data in `MainPage.js` to use these specific entry IDs

## 5. Test the Integration

1. Start the React app: `npm start`
2. Login with password "1234"
3. Enter a staff name
4. Add items to cart
5. Submit the order
6. Check your Google Form responses

## 6. Variant Catalog Setup (Products Sheet)

For variant products (e.g., T-shirt with color/size), keep Google Form for order capture and use a linked Google Sheet tab named `Products` as product catalog.

1. Open the Google Sheet linked to your form responses
2. Create a sheet named `Products`
3. Add header row with these columns:
   - `productId`
   - `productName`
   - `image`
   - `category`
   - `displayOrder`
   - `variantId`
   - `color`
   - `size`
   - `price`
   - `stockQty`
   - `active`
   - `trackStock` (optional, future use)
   - `allowBackorder` (optional, future use)
4. Add one row per variant
   - Example:
     - `TSHIRT`, `T-Shirt`, `<image-url>`, `Apparel`, `1`, `TSHIRT-BLK-M`, `Black`, `M`, `120`, `10`, `TRUE`
     - `TSHIRT`, `T-Shirt`, `<image-url>`, `Apparel`, `1`, `TSHIRT-WHT-L`, `White`, `L`, `120`, `8`, `TRUE`

Current behavior:
- POS reads products/variants from `Products` sheet through Apps Script.
- Checkout still writes to Google Form.
- Variant lines are submitted in `itemsEntryId` as text lines (for example `T-Shirt (Black / M) x2 - $240.00 | TSHIRT-BLK-M x2 @120.00`).
- `stockQty` is displayed in UI only (no stock deduction yet).

## 7. Per-Item (Variant) Form Questions

You can add one Google Form question per variant so each item's purchased quantity is recorded in its own column.

### Convention

In each per-item question's **title**, embed the `variantId` wrapped with `[#...]` as a marker. Apps Script uses this marker to map the question to the variant.

Examples (title text in the form):
- `T-Shirt Black M [#TSHIRT-BLK-M]`
- `Tote Bag [#TOTE-BAG]`
- `Mug Red [#MUG-RED]`

Rules:
- Use **Short answer** question type (value submitted will be the integer quantity).
- The marker is case-insensitive and must match the `variantId` column from the `Products` sheet.
- Fallback plain-hash form like `#TSHIRT-BLK-M` also works if no bracketed marker is present.
- Questions without a marker are ignored for per-item mapping (they can still be used for other data).

### How it works

On checkout:
1. Apps Script builds a `variantEntryIds` map (`{ variantId: entryId }`) by scanning form titles for the marker.
2. The client submits the purchased **quantity** to `entry.<entryId>` for every cart item that has a mapped question.
3. The existing aggregated `items` text field is still submitted for a human-readable summary.

### Adding a new product variant

1. Add a row in the `Products` sheet with a unique `variantId`.
2. Add a new form question whose title contains `[#<variantId>]`.
3. Re-login to the POS (the catalog and entry-ID map are fetched at login).

## Current Implementation

The current implementation simulates the form submission. To enable real Google Form submission, uncomment the fetch code in the `handleSubmit` function in `MainPage.js`.

## Form Fields Mapping

- `entry.staff_name` → Staff Name
- `entry.total_amount` → Total Amount  
- `entry.item_count` → Item Count
- `entry.items` → Items (formatted as "Item xQuantity - $Price")
- `entry.timestamp` → Timestamp
