const get = require("lodash/get");

/**
 * Formats the address given a registration address and a prefix
 * @param registration Fattmerchant Registration object
 * @param prefix Example 'business_address_'.
 */
export const formatAddress = (registration, prefix) => {
  return {
    city: get(registration, `${prefix}city`),
    country: get(registration, `${prefix}country`),
    region: (get(registration, `${prefix}state`, "") || "").substring(0, 2),
    line1: get(registration, `${prefix}1`),
    line2: get(registration, `${prefix}2`),
    postal_code: get(registration, `${prefix}zip`),
  };
};

/* The mime types accepted of the finix document upload 
process */

export const accceptedDisputeUploadTypes = {
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
  "image/png": "png",
  "image/tiff": "tiff",
};

/***
 * Given a file name, make sure it is properly formatted
 * @param fileName the original file name
 * @param contentType the mime content type (e.g.: application/pdf)
 * @returns the properly formatted fileName
 */
export const sanitizeFilename = (fileName, contentType) => {
  const validExtensions = Object.values(accceptedDisputeUploadTypes);
  let extension = "";
  if (fileName) {
    fileName = fileName.replace(/[^\w-.]/gi, "_");
    const fileNameParts = fileName?.split(".");
    if (fileNameParts && fileNameParts.length > 1) {
      //We're just going to hope that the final element in this array is a valid extension
      extension = fileNameParts.pop()?.toLowerCase() || "";
      fileName = fileNameParts.join("_");
    }
    if (!validExtensions.includes(extension)) {
      extension = accceptedDisputeUploadTypes[contentType] || "";
    }
    fileName += `.${extension}`;
  }
  return fileName;
};

/**
 * Format into Finix Date object.
 * @param date A string in this format: MM/DD/YYYY
 */
export const formatDate = (date) => {
  const split = (date || "").toString().split("/");
  return {
    year: +split[2],
    month: +split[0],
    day: +split[1],
  };
};

/**
 * Take a string-like var and format to only be numbers.
 * @param num The num-like to format.
 * @param isOutputTypeString `true` if returned output should be of type `string`, and `false` if
 * returned output should be of type `number`.
 * @example
 * formatNumeric("4,000", true); // Returns "4000"
 * @example
 * formatNumeric("4,000", false); // Returns 4000
 */
export function formatNumeric(num, isOutputTypeString) {
  if (num === null || num === undefined) return null;
  const output = num.toString().replace(/[^0-9.]/g, "");
  const result = isOutputTypeString === true ? output : +output;
  return result;
}

/**
 * Change Fattmerchant company type to Finix business type
 * @param registration Fattmerchant Registration object
 */
export const getBusinessType = (registration) => {
  const type = get(registration, "company_type");
  switch (type) {
    case "A":
      return "ASSOCIATION_ESTATE_TRUST";
    case "E":
      return "TAX_EXEMPT_ORGANIZATION";
    case "F":
    case "R":
      return null;
    case "G":
      return "GOVERNMENT_AGENCY";
    case "L":
      return "LIMITED_LIABILITY_COMPANY";
    case "P":
      return "PARTNERSHIP";
    case "S":
    case "Sole Proprietor":
      return "INDIVIDUAL_SOLE_PROPRIETORSHIP";
    case "B":
    case "V":
      return "CORPORATION";
  }
  return null;
};

/**
 * Get Business Tax Id. Is SSN if merchant isSoleProp.
 * @param registration Fattmerchant Registration object
 * @param isSoleProp True is merchant is sole prop
 */
export const getBusinessTaxId = (registration, isSoleProp) => {
  if (isSoleProp) {
    if (get(registration, "user_ssn")) {
      return formatNumeric(get(registration, "user_ssn"), true);
    }
  } else if (get(registration, "business_tax_id")) {
    return formatNumeric(get(registration, "business_tax_id"), true);
  }

  return null;
};

/**
 * Gets the ownership percentage of primary owner.
 * @param registration Fattmerchant Registration object
 */
export const getOwnershipPercentage = (registration) => {
  const meta = get(registration, "meta");
  return meta ? +meta.ownership_percentage : null;
};

/**
 * Returns true application reason is not 'Never Accepted Cards Before'
 * @param registration Fattmerchant Registration object
 */
export const getHasAcceptedCardsPreviously = (registration) => {
  return (
    get(registration, "reason_for_applying") !== "Never Accepted Cards Before"
  );
};

/**
 * Validates that a Finix Identity doesn't contain any errors
 * @param identity The finix identity to check
 * @returns An array of errors that are wrong with the identity
 */
export const validateIdentity = (identity) => {
  const errors = [];

  // Helper function for easily checking fields based on options passed in
  const errorCheck = function (name, options) {
    const field = get(identity, name);
    const { type, between, exact, length, possibleValues } = options;

    if (field === null || field === undefined) {
      errors.push(`"registration.${name}" cannot be null or empty`);
    } else if (!!type && typeof field !== type) {
      errors.push(`"registration.${name}" must be a ${type}`);
    } else if (!!exact && field.toString().length !== exact) {
      errors.push(`"registration.${name}" must be exactly ${exact} chars long`);
    } else if (!!length && field.toString().length > length) {
      errors.push(
        `"registration.${name}" must be less than ${length} chars long`
      );
    } else if (!!between && (field < between[0] || field > between[1])) {
      errors.push(
        `"registration.${name}" must be between ${between[0]} and ${between[1]}`
      );
    } else if (!!possibleValues && !possibleValues.includes(field)) {
      errors.push(
        `"registration.${name}" isn't in the list of possible values`
      );
    }
  };

  errorCheck("business_name", { type: "string", length: 120 });
  errorCheck("doing_business_as", { type: "string", length: 60 });
  errorCheck("business_tax_id", { type: "string" });
  errorCheck("url", { type: "string", length: 100 });
  errorCheck("business_phone", { type: "string", length: 10 });
  errorCheck("incorporation_date.year", { type: "number", length: 4 });
  errorCheck("incorporation_date.month", {
    type: "number",
    between: [1, 12],
  });
  errorCheck("incorporation_date.day", { type: "number", between: [1, 31] });
  errorCheck("business_address.line1", { type: "string", length: 60 });
  errorCheck("business_address.city", { type: "string", length: 20 });
  errorCheck("business_address.region", { type: "string", exact: 2 });
  errorCheck("business_address.postal_code", { type: "string", length: 7 });
  errorCheck("business_address.country", { type: "string", exact: 3 });
  errorCheck("ownership_type", {
    type: "string",
    possibleValues: ["PRIVATE", "PUBLIC"],
  });
  errorCheck("first_name", { type: "string", length: 20 });
  errorCheck("last_name", { type: "string", length: 20 });
  errorCheck("title", { type: "string", length: 60 });
  errorCheck("principal_percentage_ownership", {
    type: "number",
    between: [0, 100],
  });
  errorCheck("tax_id", { type: "string", exact: 9 });
  errorCheck("dob.year", { type: "number", length: 4 });
  errorCheck("dob.month", { type: "number", between: [1, 12] });
  errorCheck("dob.day", { type: "number", between: [1, 31] });
  errorCheck("phone", { type: "string", length: 10 });
  errorCheck("email", {
    type: "string",
    // subtype: 'email'
  });
  errorCheck("personal_address.line1", { type: "string", length: 60 });
  errorCheck("personal_address.city", { type: "string", length: 20 });
  errorCheck("personal_address.region", { type: "string", exact: 2 });
  errorCheck("personal_address.postal_code", { type: "string", length: 7 });
  errorCheck("personal_address.country", { type: "string", exact: 3 });
  errorCheck("default_statement_descriptor", { type: "string", length: 20 });
  errorCheck("annual_card_volume", { type: "number", length: 23 });
  errorCheck("max_transaction_amount", { type: "number", length: 12 });

  if (identity.mcc !== null && identity.mcc.length !== 4) {
    errors.push(`"registration.mcc" must be null or 4 characters long`);
  }
  const businessTypesWithPublicOwnership = [
    "GOVERNMENT_AGENCY",
    "TAX_EXEMPT_ORGANIZATION",
    "LIMITED_LIABILITY_COMPANY",
    "PARTNERSHIP",
    "CORPORATION",
  ];
  if (
    identity.ownership_type === "PUBLIC" &&
    !businessTypesWithPublicOwnership.includes(identity.business_type)
  ) {
    errors.push(
      'Only Government, Tax-Exempt Organizations, Limited Liability Companies, Partnerships and Corporations may have an ownership type of "PUBLIC".'
    );
  }

  return errors;
};

export const validatePaymentInstrument = (paymentInstrument) => {
  const errors = [];

  const errorCheck = (name, options, realName) => {
    const field = get(paymentInstrument, name);
    const { type, length } = options;

    if (field === null || field === undefined) {
      errors.push(`"registration.${realName || name}" cannot be null or empty`);
    } else if (typeof field !== type) {
      errors.push(`"registration.${realName || name}" must be a ${type}`);
    } else if (length !== undefined && field.toString().length > length) {
      errors.push(
        `"registration.${
          realName || name
        }" must be less than ${length} chars long`
      );
    }
  };

  errorCheck("account_number", { type: "string" }, "bank_account_number");
  errorCheck("bank_code", { type: "string" }, "bank_routing_number");
  errorCheck("name", { type: "string", length: 40 }, "bank_account_owner_name");
  // don't check, these are basically hardcoded right now
  // errorCheck('type', { type: 'string' });
  // errorCheck('identity', { type: 'string' });
  // errorCheck('account_type', { type: 'string' });

  return errors;
};

export const validateFeeProfile = (feeProfile) => {
  const errors = [];

  const errorCheck = (name, options, realName) => {
    const field = get(feeProfile, name);
    const { type } = options;

    if (field === null || field === undefined) {
      errors.push(`"registration.${realName || name}" cannot be null or empty`);
    } else if (typeof field !== type) {
      errors.push(`"registration.${realName || name}" must be a ${type}`);
    }
  };

  errorCheck("fixed_fee", { type: "number" }, "plan_txamnt");
  errorCheck("basis_points", { type: "number" }, "plan_dcamnt");
  errorCheck("ach_fixed_fee", { type: "number" }, "plan_ach_txamnt");
  errorCheck("ach_basis_points", { type: "number" }, "plan_ach_dcamnt");
  errorCheck(
    "american_express_fixed_fee",
    { type: "number" },
    "amex_mid_trans_fee"
  );
  errorCheck(
    "american_express_basis_points",
    { type: "number" },
    "amex_qual_disc_rate"
  );
  errorCheck(
    "american_express_charge_interchange",
    { type: "boolean" },
    "is_flat_rate"
  );

  return errors;
};

export const calculateAnnualVolumeByConfiguration = (
  registration,
  configuration,
  processingInfoType = "keyed-transactions"
) => {
  // Values needed for formulas.
  let cp_percent = formatNumeric(registration.card_present_percent ?? 0, false);
  let cnp_percent = formatNumeric(
    registration.card_not_present_percent ?? 0,
    false
  );

  let cc_volume = formatNumeric(registration.annual_volume ?? 0, false);

  if (processingInfoType === "shopping-cart") {
    cp_percent = formatNumeric(
      registration.shopping_cart_card_present_percent ?? 0,
      false
    );
    cnp_percent = 100 - cp_percent;

    cc_volume = formatNumeric(
      registration.annual_gross_shopping_cart_revenue ?? 0,
      false
    );
  }

  const ach_volume = formatNumeric(
    registration.annual_gross_ach_revenue ?? 0,
    false
  );

  let annualVolume = 0;

  // Annual volume formulas.
  switch (configuration) {
    case FinixConfigurations.Litle_CNP:
      annualVolume = cc_volume * (cnp_percent / 100);
      break;
    case FinixConfigurations.Litle_ACH:
      annualVolume = ach_volume;
      break;
    case FinixConfigurations.Litle_CNP_ACH:
      annualVolume = ach_volume + cc_volume * (cnp_percent / 100);
      break;
    case FinixConfigurations.Core_CP:
      annualVolume = cc_volume * (cp_percent / 100);
      break;
    case FinixConfigurations.Core_CNP:
      annualVolume = cc_volume * (cnp_percent / 100);
      break;
    case FinixConfigurations.Core_CNP_CP:
      annualVolume = cc_volume;
      break;
  }

  return Math.round(annualVolume * 100); // Convert to cents.
};

/**
 * Validates the registration model has specific values filled in for a particular configuration.
 * Ex ACH configuration must have "Annual Gross ACH Revenue, Average ACH Transaction Size, and Largest ACH Transaction Size" filled in.
 * @param registration
 * @param configuration
 */
export const validateRegistrationModelByConfiguration = (
  registration,
  configuration
) => {
  const errors = [];

  // These fields must be present for any ACH configurations.
  if (
    (configuration === FinixConfigurations.Litle_ACH ||
      configuration === FinixConfigurations.Litle_CNP_ACH) &&
    !(
      registration.annual_gross_ach_revenue &&
      registration.avg_ach_transaction &&
      registration.largest_ach_transaction
    )
  ) {
    errors.push("Please enter valid ACH volumes.");
  }

  // These fields must be present for any CC configurations.
  if (
    configuration !== FinixConfigurations.Litle_ACH &&
    configuration !== FinixConfigurations.Litle_CNP_ACH &&
    !(
      registration.annual_volume &&
      registration.avg_trans_size &&
      registration.highest_trans_amount
    )
  ) {
    errors.push("Please enter valid credit card volumes.");
  }

  // Values needed for formulas.
  const cp_percent = registration.card_present_percent;
  const cnp_percent = registration.card_not_present_percent;
  const cc_volume = registration.annual_volume;
  const ach_volume = registration.annual_gross_ach_revenue;
  const cp_transaction_rate = registration.cp_transaction_rate;
  const cp_per_item_rate = registration.cp_per_item_rate;

  // Fields verbiages
  const cp_percent_verbiage = "Card Present %";
  const cnp_percent_verbiage = "Card Not Present %";
  const cc_volume_verbiage = "Annual Volume";
  const ach_volume_verbiage = "Annual Gross ACH Revenue";
  const cp_transaction_rate_verbiage = "Card Present Discount Fees";
  const cp_per_item_rate_verbiage = "Card Present Transaction Amount";

  // Validate presence of fields required for calculations.
  switch (configuration) {
    case FinixConfigurations.Litle_CNP:
      if (!cc_volume) {
        errors.push("Missing field: " + cc_volume_verbiage);
      }
      if (!cnp_percent) {
        errors.push("Missing field: " + cnp_percent_verbiage);
      }
      break;
    case FinixConfigurations.Litle_ACH:
      if (!ach_volume) {
        errors.push("Missing field: " + ach_volume_verbiage);
      }
      break;
    case FinixConfigurations.Litle_CNP_ACH:
      if (!ach_volume) {
        errors.push("Missing field: " + ach_volume_verbiage);
      }
      if (!cc_volume) {
        errors.push("Missing field: " + cc_volume_verbiage);
      }
      if (!cnp_percent) {
        errors.push("Missing field: " + cnp_percent_verbiage);
      }
      break;
    case FinixConfigurations.Core_CP:
      // These are used for calculations.
      if (!cc_volume) {
        errors.push("Missing field: " + cc_volume_verbiage);
      }
      if (!cp_percent) {
        errors.push("Missing field: " + cp_percent_verbiage);
      }

      // These are used for buildFeeProfile();
      if (!cp_transaction_rate) {
        errors.push("Missing field: " + cp_transaction_rate_verbiage);
      }
      if (!cp_per_item_rate) {
        errors.push("Missing field: " + cp_per_item_rate_verbiage);
      }
      break;
    case FinixConfigurations.Core_CNP:
      if (!cc_volume) {
        errors.push("Missing field: " + cc_volume_verbiage);
      }
      if (!cnp_percent) {
        errors.push("Missing field: " + cnp_percent_verbiage);
      }
      break;
    case FinixConfigurations.Core_CNP_CP:
      if (!cc_volume) {
        errors.push("Missing field: " + cc_volume_verbiage);
      }
      break;
  }

  return errors;
};

export const FinixConfigurations = {
  Litle_CNP: "Litle_CNP",
  Litle_ACH: "Litle_ACH",
  Litle_CNP_ACH: "Litle_CNP_ACH",
  Core_CP: "Core_CP",
  Core_CNP: "Core_CNP",
  Core_CNP_CP: "Core_CNP_CP",
};

module.exports.formatAddress = formatAddress;
module.exports.accceptedDisputeUploadTypes = accceptedDisputeUploadTypes;
module.exports.sanitizeFilename = sanitizeFilename;
module.exports.formatDate = formatDate;
module.exports.getBusinessType = getBusinessType;
module.exports.getBusinessTaxId = getBusinessTaxId;
module.exports.getOwnershipPercentage = getOwnershipPercentage;
module.exports.getHasAcceptedCardsPreviously = getHasAcceptedCardsPreviously;
module.exports.validateIdentity = validateIdentity;
module.exports.validatePaymentInstrument = validatePaymentInstrument;
module.exports.validateFeeProfile = validateFeeProfile;
module.exports.calculateAnnualVolumeByConfiguration =
  calculateAnnualVolumeByConfiguration;
module.exports.validateRegistrationModelByConfiguration =
  validateRegistrationModelByConfiguration;
module.exports.FinixConfigurations = FinixConfigurations;
module.exports.formatNumeric = formatNumeric;
