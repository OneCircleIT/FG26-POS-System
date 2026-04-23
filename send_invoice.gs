// To learn how to use this script, refer to the documentation:
// https://developers.google.com/apps-script/samples/automations/generate-pdfs

/*
Copyright 2022 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// TODO: To test this solution, set EMAIL_OVERRIDE to true and set EMAIL_ADDRESS_OVERRIDE to your email address.
const EMAIL_OVERRIDE = false;
const EMAIL_ADDRESS_OVERRIDE = 'alnwyc@gmail.com';

// Application constants
const APP_TITLE = 'Generate and send PDFs';
const OUTPUT_FOLDER_NAME = "pos-system-invoices";

// Sheet name constants. Update if you change the names of the sheets.
const CUSTOMERS_SHEET_NAME = 'Form Responses';
const INVOICE_TEMPLATE_SHEET_NAME = 'Invoice Template';

// Email constants
const EMAIL_SUBJECT = '同心圓-The Very First購買產品收據';
const EMAIL_BODY = '親愛的弟兄姊妹，\r\n\r\n您好！非常感恩可以與您一同敬拜、分享，感謝您認獻了我們的產品，附件中是有關收據，請參閱。\r\n如仍有問題，請再聯絡我們。\r\n\r\n願 神賜福給您! \r\n\r\nOne Circle Sales Team\r\nOne Circle Limited\r\nRm606, 6/F, Sunbeam Center, \r\n27 Shing Yip St. Kwun Tong, Hong Kong\r\nT: 3955 3955\r\nF: 2311 9909';


/**
 * Iterates through the worksheet data populating the template sheet with 
 * customer data, then saves each instance as a PDF document.
 * 
 * Called by user via custom menu item.
 */
function processDocuments() {

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    Logger.log("Could not obtain lock after 30 seconds: " + e);
    return; // Exit if unable to get lock
  }


  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const formResponsesSheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
  const invoiceTemplateSheet = ss.getSheetByName(INVOICE_TEMPLATE_SHEET_NAME);

  // Gets data from the storage sheets as objects.
  const responses = dataRangeToObject(formResponsesSheet);

  ss.toast('Creating Invoices', APP_TITLE, 1);


  // Iterates for each customer calling createInvoiceForCustomer routine.
  responses.forEach(function (customer, index) {
    if (!customer.invoice_email || customer.email_sent || customer.invoice_url) {
      return;
    }

    ss.toast(`Creating Invoice for ${customer.invoice_email}`, APP_TITLE, 1);

    let invoice = createInvoiceForCustomer(
      customer, invoiceTemplateSheet, ss.getId());

    const invoiceUrlRange = formResponsesSheet.createTextFinder('Invoice Url').findNext();
    const invoiceUrlColumn = invoiceUrlRange.getColumn();

    const emailSentRange = formResponsesSheet.createTextFinder('Email Sent').findNext();
    const emailSentColumn = emailSentRange.getColumn();

    formResponsesSheet.getRange(index + 2, invoiceUrlColumn).setValue(invoice.url);
    formResponsesSheet.getRange(index + 2, emailSentColumn).setValue('No');
  });

  try {
    // Your onFormSubmit logic here
    // e.g., process form data, send emails, etc.
  } finally {
    lock.releaseLock(); // Always release the lock
  }
}

/**
 * Processes each customer instance with passed in data parameters.
 * 
 * @param {object} customer - Object for the customer
 * @param {object} products - Object for all the products
 * @param {object} transactions - Object for all the transactions
 * @param {object} invoiceTemplateSheet - Object for the invoice template sheet
 * @param {string} ssId - Google Sheet ID     
 * Return {array} of instance customer invoice data
 */
function createInvoiceForCustomer(responseRow, templateSheet, ssId) {

  // Clears existing data from the template.
  clearTemplateSheet();

  var itemKeys = Object.keys(responseRow).filter(function(keyName) {
    if (keyName.startsWith('item-')) {
      if (responseRow[keyName]) {
        return true;
      }
    }
    return false;
  })


  const invoiceNumber = new Date().getTime();
  const invoiceDate = new Date(responseRow['時間戳記']);
  const invoiceDateStr = invoiceDate.getDate() + '/' + (invoiceDate.getMonth()+1) + '/' + invoiceDate.getFullYear();


  // Sets values in the template.
  templateSheet.getRange('E12').setValue(responseRow.invoice_email);
  templateSheet.getRange('J12').setValue(invoiceDateStr);
  
  let lineItems = [];
  var rowNum = 20;
  itemKeys.forEach(function(key, index) {
    if (index !== 0) {
      templateSheet.insertRowsAfter(rowNum, 1);
      rowNum++;
      templateSheet.getRange('B20:L20').copyTo(templateSheet.getRange(`B${rowNum}:L${rowNum}`));
    }
    const splitedStr = key.split(';$');
    templateSheet.getRange(`B${rowNum}:L${rowNum}`).setValues([[
      splitedStr[0].replace('item-', ''),
      '', '', '', '',
      responseRow[key],
      splitedStr[1], '', '',
      parseInt(responseRow[key]) * parseFloat(splitedStr[1]), '',
    ]]);
  });


  templateSheet.getRange('G' + (rowNum + 2)).setValue(responseRow.item_count);
  templateSheet.getRange('K' + (rowNum + 2)).setValue(responseRow.total_amount);
  templateSheet.getRange('D' + (rowNum + 4)).setValue(responseRow.payment_method);

  var firstValue = responseRow.invoice_email.split("@")[0];

  // Cleans up and creates PDF.
  SpreadsheetApp.flush();
  Utilities.sleep(500); // Using to offset any potential latency in creating .pdf
  // PDF name
  // const pdf = createPDF(ssId, templateSheet, `Invoice#${invoiceNumber}-${responseRow.invoice_email}`, rowNum + 12);
  const pdf = createPDF(ssId, templateSheet, `${firstValue}_同心圓收據`, rowNum + 12);

  
  return {
    url: pdf.getUrl(),
  };
}

/**
* Resets the template sheet by clearing out customer data.
* You use this to prepare for the next iteration or to view blank
* the template for design.
* 
* Called by createInvoiceForCustomer() or by the user via custom menu item.
*/
function clearTemplateSheet() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = ss.getSheetByName(INVOICE_TEMPLATE_SHEET_NAME);
  // Clears existing data from the template.
  const grantTotal = templateSheet.createTextFinder('Grant Total Amount:').findNext();
  const grantTotalRowIndex = grantTotal.getRowIndex();

  Logger.log(grantTotalRowIndex);
  if (grantTotalRowIndex > 22) {
    templateSheet.deleteRows(21, grantTotalRowIndex - 22);
  }
  const rngClear = templateSheet.getRangeList(['E12', 'J12' , 'B20:L20', 'G22', 'K22', 'D24']).getRanges();

  rngClear.forEach(function (cell) {
    cell.clearContent();
  });
  // This sample only accounts for six rows of data 'B18:G24'. You can extend or make dynamic as necessary.
  templateSheet.getRange(20, 2, 1, 1).clearContent();
}

/**
 * Creates a PDF for the customer given sheet.
 * @param {string} ssId - Id of the Google Spreadsheet
 * @param {object} sheet - Sheet to be converted as PDF
 * @param {string} pdfName - File name of the PDF being created
 * @return {file object} PDF file as a blob
 */
function createPDF(ssId, sheet, pdfName, totalRow) {
  const fr = 0, fc = 0, lc = 13, lr = totalRow;
  const url = "https://docs.google.com/spreadsheets/d/" + ssId + "/export" +
    "?format=pdf&" +
    "size=7&" +
    "fzr=true&" +
    "portrait=true&" +
    "fitw=true&" +
    "gridlines=false&" +
    "printtitle=false&" +
    "top_margin=0.2&" +
    "bottom_margin=0.2&" +
    "left_margin=0.2&" +
    "right_margin=0.2&" +
    "sheetnames=false&" +
    "pagenum=UNDEFINED&" +
    "attachment=true&" +
    "gid=" + sheet.getSheetId() + '&' +
    "r1=" + fr + "&c1=" + fc + "&r2=" + lr + "&c2=" + lc;

  const params = { method: "GET", headers: { "authorization": "Bearer " + ScriptApp.getOAuthToken() } };
  const blob = UrlFetchApp.fetch(url, params).getBlob().setName(pdfName + '.pdf');

  // Gets the folder in Drive where the PDFs are stored.
  const folder = getFolderByName_(OUTPUT_FOLDER_NAME);

  const pdfFile = folder.createFile(blob);
  return pdfFile;
}


/**
 * Sends emails with PDF as an attachment.
 * Checks/Sets 'Email Sent' column to 'Yes' to avoid resending.
 * 
 * Called by user via custom menu item.
 */
function sendEmails() {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
  } catch (e) {
    Logger.log("Could not obtain lock after 30 seconds: " + e);
    return; // Exit if unable to get lock
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const formResponsesSheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
  const responses = dataRangeToObject(formResponsesSheet);


  ss.toast('Emailing Invoices', APP_TITLE, 1);
  responses.forEach(function (row, index) {

    if (row.email_sent != 'Yes' && row.invoice_url) {
      ss.toast(`Emailing Invoice for ${row.invoice_email}`, APP_TITLE, 1);

      const fileId = row.invoice_url.match(/[-\w]{25,}(?!.*[-\w]{25,})/)
      const attachment = DriveApp.getFileById(fileId);

      let recipient = row.invoice_email;
      if (EMAIL_OVERRIDE) {
        recipient = EMAIL_ADDRESS_OVERRIDE
      }

      GmailApp.sendEmail(recipient, EMAIL_SUBJECT, EMAIL_BODY, {
        attachments: [attachment.getAs(MimeType.PDF)],
        name: "One Circle"
      });

      
      const emailSentRange = formResponsesSheet.createTextFinder('Email Sent').findNext();
      const emailSentColumn = emailSentRange.getColumn();

      formResponsesSheet.getRange(index + 2, emailSentColumn).setValue('Yes');
    }
  });

  try {
    // Your onFormSubmit logic here
    // e.g., process form data, send emails, etc.
  } finally {
    lock.releaseLock(); // Always release the lock
  }
}

/**
 * Helper function that turns sheet data range into an object. 
 * 
 * @param {SpreadsheetApp.Sheet} sheet - Sheet to process
 * Return {object} of a sheet's datarange as an object 
 */
function dataRangeToObject(sheet) {
  const dataRange = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const keys = dataRange.splice(0, 1)[0];
  return getObjects(dataRange, createObjectKeys(keys));
}

/**
 * Utility function for mapping sheet data to objects.
 */
function getObjects(data, keys) {
  let objects = [];
  for (let i = 0; i < data.length; ++i) {
    let object = {};
    let hasData = false;
    for (let j = 0; j < data[i].length; ++j) {
      let cellData = data[i][j];
      if (isCellEmpty(cellData)) {
        continue;
      }
      object[keys[j]] = cellData;
      hasData = true;
    }
    if (hasData) {
      objects.push(object);
    }
  }
  return objects;
}
// Creates object keys for column headers.
function createObjectKeys(keys) {
  return keys.map(function (key) {
    if(/^[A-Za-z ]+$/.test(key)) {
      return key.replace(/\W+/g, '_').toLowerCase();
    }
    return key;
  });
}
// Returns true if the cell where cellData was read from is empty.
function isCellEmpty(cellData) {
  return typeof (cellData) == "string" && cellData == "";
}
