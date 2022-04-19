const fs = require("fs");
const csv = require("fast-csv");
const crypto = require("crypto");
const { format } = require("@fast-csv/format");

const { db } = require("../util/db-util");

const getRegistrations = async () => {
  return new Promise((resolve, reject) => {
    db().query(
      `
      SELECT
        r.*
      FROM fatt.merchants AS m
      JOIN fatt.registrations AS r ON r.merchant_id = m.id
      WHERE
        m.is_payfac = 1
        AND m.status = 'ACTIVE'
        AND m.brand NOT LIKE "%-sandbox"
    `,
      [],
      (error, rows) => {
        if (error) {
          reject(error);
        } else if (rows) {
          resolve(rows);
        } else {
          resolve(null);
        }
      }
    );
  });
};

const baseRow = () => ({
  RoutingNumber: null,
  AccountNumber: null,
  CheckNumber: null,
  Amount: null,
  UniqueID: null,
  NamePrefix: null,
  FirstName: null,
  MiddleName: null,
  LastName: null,
  NameSuffix: null,
  BusinessName: null,
  AddressLine1: null,
  AddressLine2: null,
  City: null,
  State: null,
  ZipCode: null,
  HomePhoneNumber: null,
  WorkPhoneNumber: null,
  TaxID: null,
  DateOfBirth: null,
  IDType: null,
  DLNumber: null,
  DLState: null,
  EmailAddress: null,
  BankAccountType: null,
  Country: null,
  CurrentIpAddress: null,
});

const md5 = (...s) => {
  return crypto
    .createHash("md5")
    .update(s.map((e) => (e || "").trim()).join(""))
    .digest("hex");
};

const upper = (s) => {
  if (!s) return s;
  return s.toUpperCase();
};

const run = async () => {
  console.log("running giact-csv-maker...");

  const registrations = await getRegistrations();

  console.log(`found ${registrations.length} registrations matching query`);

  const csvStream = format({ headers: true });
  const writeStream = fs.createWriteStream("csv/output.csv");
  csvStream.pipe(writeStream);

  let count = 0;

  registrations.forEach((r) => {
    // business
    const brow = baseRow();

    brow.RoutingNumber = r.bank_routing_number;
    brow.AccountNumber = r.bank_account_number;
    brow.CheckNumber = null;
    brow.Amount = null;
    brow.UniqueID = md5(r.business_tax_id);
    brow.NamePrefix = null;
    brow.FirstName = null;
    brow.MiddleName = null;
    brow.LastName = null;
    brow.NameSuffix = null;
    brow.BusinessName = r.business_legal_name;
    brow.AddressLine1 = r.business_location_address_1;
    brow.AddressLine2 = r.business_location_address_2;
    brow.City = r.business_location_address_city;
    brow.State = r.business_location_address_state;
    brow.ZipCode = r.business_location_address_zip;
    brow.HomePhoneNumber = null;
    brow.WorkPhoneNumber = r.business_location_phone_number;
    brow.TaxID = r.business_tax_id;
    brow.DateOfBirth = null;
    brow.IDType = null;
    brow.DLNumber = null;
    brow.DLState = null;
    brow.EmailAddress = r.business_location_email;
    brow.BankAccountType = r.bank_account_type || "SALES";
    brow.Country = null;
    brow.CurrentIpAddress = r.user_ip;

    csvStream.write(brow);

    // principal signer
    const psrow = baseRow();

    psrow.RoutingNumber = null;
    psrow.AccountNumber = null;
    psrow.CheckNumber = null;
    psrow.Amount = null;
    psrow.UniqueID = md5(
      upper(r.first_name),
      upper(r.last_name),
      upper(r.user_dob)
    );
    psrow.NamePrefix = null;
    psrow.FirstName = r.first_name;
    psrow.MiddleName = null;
    psrow.LastName = r.last_name;
    psrow.NameSuffix = null;
    psrow.BusinessName = null;
    psrow.AddressLine1 = r.owner_address_1;
    psrow.AddressLine2 = r.owner_address_2;
    psrow.City = r.owner_address_city;
    psrow.State = r.owner_address_state;
    psrow.ZipCode = r.owner_address_zip;
    psrow.HomePhoneNumber = r.phone_number;
    psrow.WorkPhoneNumber = null;
    psrow.TaxID = r.user_ssn;
    psrow.DateOfBirth = r.user_dob;
    psrow.IDType = null;
    psrow.DLNumber = null;
    psrow.DLState = null;
    psrow.EmailAddress = null;
    psrow.BankAccountType = null;
    psrow.Country = null;
    psrow.CurrentIpAddress = r.user_ip;

    csvStream.write(psrow);

    count += 2;

    if (r.meta && r.meta.includes("representatives")) {
      try {
        const representatives = JSON.parse(r.meta).representatives;

        representatives.forEach((representative) => {
          const asrow = baseRow();

          // additional signer
          asrow.RoutingNumber = null;
          asrow.AccountNumber = null;
          asrow.CheckNumber = null;
          asrow.Amount = null;
          asrow.UniqueID = md5(
            upper(representative.first_name),
            upper(representative.last_name),
            upper(representative.date_of_birth)
          );
          asrow.NamePrefix = null;
          asrow.FirstName = representative.first_name;
          asrow.MiddleName = null;
          asrow.LastName = representative.last_name;
          asrow.NameSuffix = null;
          asrow.BusinessName = null;
          asrow.AddressLine1 = representative.address_1;
          asrow.AddressLine2 = representative.address_2;
          asrow.City = representative.address_city;
          asrow.State = representative.address_state;
          asrow.ZipCode = representative.address_zip;
          asrow.HomePhoneNumber = representative.phone;
          asrow.WorkPhoneNumber = null;
          asrow.TaxID = representative.ssn;
          asrow.DateOfBirth = representative.date_of_birth;
          asrow.IDType = null;
          asrow.DLNumber = null;
          asrow.DLState = null;
          asrow.EmailAddress = null;
          asrow.BankAccountType = null;
          asrow.Country = null;
          asrow.CurrentIpAddress = r.user_ip;

          count++;

          csvStream.write(asrow);
        });
      } catch (error) {
        console.log(r.merchant_id, r.meta, error);
      }
    }
  });

  console.log("wrote", count, "rows");
};

module.exports = { run };
