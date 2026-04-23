const FORM_VIEW_URL = "https://docs.google.com/forms/d/e/1FAIpQLScxBqBa9_xe53w68ef0rh6CPG2zdgwvvQIDaC4JOYWQx1fHJg/viewform";
const FORM_SUBMIT_URL = "https://docs.google.com/forms/d/e/1FAIpQLScxBqBa9_xe53w68ef0rh6CPG2zdgwvvQIDaC4JOYWQx1fHJg/formResponse";
const PRODUCTS_SHEET_NAME = "Products";
// Optional: set this to bypass FormApp.openByUrl permission/deleted-form issues.
// Example: const PRODUCTS_SPREADSHEET_ID = "1AbCdEf...";
const PRODUCTS_SPREADSHEET_ID = "";

function extractFBData(html) {
  const regex = /var FB_PUBLIC_LOAD_DATA_ .*?<\/script>/s;
  const match = html.match(regex);
  if (match) {
    return match[0];
  }
  return null;
}

function removeLastScriptTag(inputString) {
  if (!inputString) {
    return null;
  }
  const lastIndex = inputString.lastIndexOf(";</script>");
  if (lastIndex === -1) {
    return inputString;
  }
  return inputString.substring(27, lastIndex) + inputString.substring(lastIndex + 10);
}

function normalizeHeader(header) {
  return String(header || "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseNumber(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === "" || value === null || typeof value === "undefined") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const str = String(value).trim().toLowerCase();
  if (["true", "yes", "1", "y"].indexOf(str) >= 0) {
    return true;
  }
  if (["false", "no", "0", "n"].indexOf(str) >= 0) {
    return false;
  }
  return fallback;
}

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findEntryId(formData, text) {
  const questions = formData && formData[1] && formData[1][1] ? formData[1][1] : [];
  const found = questions.find((item) => {
    return item && item[1] && item[1].toLowerCase() === text.toLowerCase();
  });
  if (!found || !found[4] || !found[4][0]) {
    return null;
  }
  return found[4][0][0];
}

function getFormPublicData() {
  const res = UrlFetchApp.fetch(FORM_VIEW_URL);
  const content = res.getContentText();
  const fbScript = removeLastScriptTag(extractFBData(content));
  if (!fbScript) {
    throw new Error("Unable to read Google Form metadata.");
  }
  return JSON.parse(fbScript);
}

function buildCatalogFromProductsSheet() {
  let spreadsheet = null;
  if (PRODUCTS_SPREADSHEET_ID) {
    spreadsheet = SpreadsheetApp.openById(PRODUCTS_SPREADSHEET_ID);
  } else {
    const form = FormApp.openByUrl(FORM_VIEW_URL);
    const spreadsheetId = form.getDestinationId();
    if (!spreadsheetId) {
      return [];
    }
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  }

  const sheet = spreadsheet.getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0].map(normalizeHeader);
  const idx = {};
  headers.forEach((header, index) => {
    idx[header] = index;
  });

  const productsById = {};
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const productName = String(
      row[idx.productname] || row[idx.name] || ""
    ).trim();
    if (!productName) {
      continue;
    }

    const productId = String(
      row[idx.productid] || toSlug(productName)
    ).trim();
    const color = String(row[idx.color] || "").trim();
    const size = String(row[idx.size] || "").trim();
    const variantId = String(
      row[idx.variantid] ||
      [productId, toSlug(color), toSlug(size), rowIndex].filter(Boolean).join("-")
    ).trim();

    const variant = {
      variantId: variantId,
      color: color,
      size: size,
      price: parseNumber(row[idx.price], 0),
      stockQty: parseNumber(row[idx.stockqty], 0),
      active: parseBoolean(row[idx.active], true),
      trackStock: parseBoolean(row[idx.trackstock], false),
      allowBackorder: parseBoolean(row[idx.allowbackorder], false),
    };

    if (!productsById[productId]) {
      productsById[productId] = {
        productId: productId,
        name: productName,
        image: String(row[idx.image] || "").trim(),
        category: String(row[idx.category] || "").trim(),
        displayOrder: parseNumber(row[idx.displayorder], rowIndex),
        variants: [],
      };
    }

    productsById[productId].variants.push(variant);
  }

  return Object.keys(productsById)
    .map((key) => productsById[key])
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function getLegacyItemsFromProducts(products) {
  const items = [];
  products.forEach((product) => {
    (product.variants || []).forEach((variant) => {
      const labelParts = [product.name];
      if (variant.color) {
        labelParts.push(variant.color);
      }
      if (variant.size) {
        labelParts.push(variant.size);
      }
      items.push({
        id: variant.variantId,
        name: labelParts.join(" - "),
        price: parseNumber(variant.price, 0),
        image: product.image || "",
        stockQty: parseNumber(variant.stockQty, 0),
      });
    });
  });
  return items;
}

function getLegacyItemsFromFormData(formData) {
  const questions = formData && formData[1] && formData[1][1] ? formData[1][1] : [];
  return questions
    .filter((item) => item && item[1] && item[1].indexOf("item-") === 0)
    .map((item) => ({
      id: item[4][0][0].toString(),
      name: item[1].split(";$")[0].replace("item-", ""),
      price: parseNumber(item[1].split(";$")[1], 0),
      image: item[2],
      stockQty: 0,
    }));
}

function getItemsAndEntryIds() {
  const formData = getFormPublicData();
  let products = [];
  try {
    products = buildCatalogFromProductsSheet();
  } catch (error) {
    // Do not block login when catalog sheet is unavailable or inaccessible.
    products = [];
  }
  const compatibilityItems = products.length > 0
    ? getLegacyItemsFromProducts(products)
    : getLegacyItemsFromFormData(formData);

  return {
    success: true,
    formSubmitUrl: FORM_SUBMIT_URL,
    catalogVersion: new Date().toISOString(),
    products: products,
    items: compatibilityItems,
    paymentMethodEntryId: findEntryId(formData, "payment method"),
    staffNameEntryId: findEntryId(formData, "staff name"),
    totalAmountEntryId: findEntryId(formData, "total amount"),
    itemCountEntryId: findEntryId(formData, "item count"),
    invoiceEmailEntryId: findEntryId(formData, "invoice email"),
    itemsEntryId: findEntryId(formData, "items"),
    remarksEntryId: findEntryId(formData, "remarks"),
  };
}

function createApiOutput(payload, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(payload) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildAuthResponse(passcode) {
  if (passcode === "260502") {
    return getItemsAndEntryIds();
  }
  return { error: "Incorrect password" };
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const payload = buildAuthResponse(params.passcode);
  return createApiOutput(payload, params.callback);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents || "{}");
  const payload = buildAuthResponse(params.passcode);
  return createApiOutput(payload, null);
}
