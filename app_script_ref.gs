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

// Match a form question to a variant by scanning the question title
// for a marker like "[#VARIANTID]" or "#VARIANTID" (case-insensitive).
// Returns a map: { variantId: entryId }
function findVariantEntryIds(formData, products) {
  const questions = formData && formData[1] && formData[1][1] ? formData[1][1] : [];
  const map = {};
  if (!Array.isArray(products) || products.length === 0) {
    return map;
  }

  // Build a quick lookup: normalized variantId -> original variantId
  const variantLookup = {};
  products.forEach((product) => {
    (product.variants || []).forEach((variant) => {
      const vid = String(variant.variantId || "").trim();
      if (!vid) return;
      variantLookup[vid.toLowerCase()] = vid;
    });
  });

  questions.forEach((q) => {
    if (!q || !q[1] || !q[4] || !q[4][0]) return;
    const title = String(q[1]).toLowerCase();
    const entryId = q[4][0][0];

    // Prefer explicit bracket marker [#variantId]
    const bracketMatch = title.match(/\[#\s*([a-z0-9][a-z0-9\-_]*)\s*\]/i);
    if (bracketMatch) {
      const key = bracketMatch[1].toLowerCase();
      if (variantLookup[key] && !map[variantLookup[key]]) {
        map[variantLookup[key]] = entryId;
        return;
      }
    }

    // Fallback: plain "#variantId" token anywhere in title
    const hashMatch = title.match(/#\s*([a-z0-9][a-z0-9\-_]*)/i);
    if (hashMatch) {
      const key = hashMatch[1].toLowerCase();
      if (variantLookup[key] && !map[variantLookup[key]]) {
        map[variantLookup[key]] = entryId;
      }
    }
  });

  return map;
}

function getProductsSpreadsheet() {
  if (PRODUCTS_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(PRODUCTS_SPREADSHEET_ID);
  }

  const form = FormApp.openByUrl(FORM_VIEW_URL);
  const spreadsheetId = form.getDestinationId();
  if (!spreadsheetId) {
    return null;
  }
  return SpreadsheetApp.openById(spreadsheetId);
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
  const spreadsheet = getProductsSpreadsheet();
  if (!spreadsheet) {
    return [];
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

    const variantImage = String(
      row[idx.variantimage] || row[idx.variantimageurl] || ""
    ).trim();
    const variantName = String(row[idx.variantname] || "").trim();

    const variant = {
      variantId: variantId,
      name: variantName,
      color: color,
      size: size,
      price: parseNumber(row[idx.price], 0),
      stockQty: parseNumber(row[idx.stockqty], 0),
      active: parseBoolean(row[idx.active], true),
      trackStock: parseBoolean(row[idx.trackstock], false),
      allowBackorder: parseBoolean(row[idx.allowbackorder], false),
      image: variantImage,
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

function normalizeStockDeductionItems(items) {
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (error) {
      items = [];
    }
  }
  if (!Array.isArray(items)) {
    return {};
  }

  const quantitiesByVariantId = {};
  items.forEach((item) => {
    const variantId = String(item.variantId || item.id || "").trim();
    const quantity = Math.max(0, parseNumber(item.quantity, 0));
    if (!variantId || quantity <= 0) {
      return;
    }
    const key = variantId.toLowerCase();
    quantitiesByVariantId[key] = (quantitiesByVariantId[key] || 0) + quantity;
  });
  return quantitiesByVariantId;
}

function deductStockFromProductsSheet(items) {
  const quantitiesByVariantId = normalizeStockDeductionItems(items);
  const requestedVariantIds = Object.keys(quantitiesByVariantId);
  if (requestedVariantIds.length === 0) {
    return { updated: [], missing: [] };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const spreadsheet = getProductsSpreadsheet();
    if (!spreadsheet) {
      throw new Error("Products spreadsheet is not linked.");
    }

    const sheet = spreadsheet.getSheetByName(PRODUCTS_SHEET_NAME);
    if (!sheet) {
      throw new Error("Products sheet not found.");
    }

    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) {
      throw new Error("Products sheet has no product rows.");
    }

    const headers = values[0].map(normalizeHeader);
    const idx = {};
    headers.forEach((header, index) => {
      idx[header] = index;
    });

    if (typeof idx.stockqty === "undefined") {
      throw new Error("Products sheet needs a stockQty column.");
    }

    const seen = {};
    const updated = [];
    const writes = [];

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
      const key = variantId.toLowerCase();
      const requestedQty = quantitiesByVariantId[key];

      if (!requestedQty) {
        continue;
      }

      const previousStock = parseNumber(row[idx.stockqty], 0);
      const newStock = Math.max(0, previousStock - requestedQty);
      const deductedQty = previousStock - newStock;

      writes.push({
        rowNumber: rowIndex + 1,
        stockQty: newStock,
      });
      seen[key] = true;
      updated.push({
        variantId: variantId,
        requestedQty: requestedQty,
        deductedQty: deductedQty,
        previousStock: previousStock,
        stockQty: newStock,
      });
    }

    const missing = requestedVariantIds.filter((variantId) => !seen[variantId]);
    if (missing.length > 0) {
      throw new Error("Products sheet missing variantId: " + missing.join(", "));
    }

    writes.forEach((write) => {
      sheet.getRange(write.rowNumber, idx.stockqty + 1).setValue(write.stockQty);
    });

    return { updated: updated, missing: missing };
  } finally {
    lock.releaseLock();
  }
}

function getNamedValue(namedValues, fieldName) {
  const target = normalizeHeader(fieldName);
  const keys = Object.keys(namedValues || {});
  for (let i = 0; i < keys.length; i += 1) {
    if (normalizeHeader(keys[i]) === target) {
      const value = namedValues[keys[i]];
      return Array.isArray(value) ? value.join("\n") : String(value || "");
    }
  }
  return "";
}

function getStockItemsFromFormSubmitEvent(e) {
  const itemsText = getNamedValue(e && e.namedValues ? e.namedValues : {}, "items");
  const items = [];
  const regex = /\|\s*([^\s|@]+)\s+x\s*(\d+(?:\.\d+)?)\s*@/gi;
  let match = regex.exec(itemsText);

  while (match) {
    items.push({
      variantId: match[1],
      quantity: parseNumber(match[2], 0),
    });
    match = regex.exec(itemsText);
  }

  return items;
}

function deductStockOnFormSubmit(e) {
  const items = getStockItemsFromFormSubmitEvent(e);
  if (items.length === 0) {
    return;
  }
  deductStockFromProductsSheet(items);
}

function onFormSubmit(e) {
  // Stock is deducted by the web app's explicit deductStock API call after checkout succeeds.
  // Keep this empty to avoid double deduction if an old form-submit trigger is still installed.
}

function getLegacyItemsFromProducts(products) {
  const items = [];
  products.forEach((product) => {
    (product.variants || []).forEach((variant) => {
      const labelParts = [variant.name || product.name];
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
        image: variant.image || product.image || "",
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
    variantEntryIds: findVariantEntryIds(formData, products),
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

function buildApiResponse(params) {
  if (params.action === "deductStock") {
    if (params.passcode !== "260502") {
      return { success: false, error: "Incorrect password" };
    }
    let stockUpdate = null;
    try {
      stockUpdate = deductStockFromProductsSheet(params.items || []);
    } catch (error) {
      return {
        success: false,
        error: error && error.message ? error.message : "Unable to deduct stock.",
      };
    }
    return {
      success: true,
      stockUpdate: stockUpdate,
    };
  }

  return buildAuthResponse(params.passcode);
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const payload = buildApiResponse(params);
  return createApiOutput(payload, params.callback);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents || "{}");
  const payload = buildApiResponse(params);
  return createApiOutput(payload, null);
}
