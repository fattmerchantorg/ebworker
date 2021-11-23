const axios = require("axios");
const get = require("lodash/get");
const finixUtils = require("./finix-utils");

function propNotNullable(t, k) {
  return t[k] != null;
}

export function getIfNotNull(obj, key, defaultValue) {
  const value = get(obj, key, defaultValue);
  return value === null || value === undefined ? defaultValue : value;
}

class Finix {
  username;
  password;
  baseUrl;
  /**
   * Example!
   * ```
   * // Setup
   * const Finix = require(path);
   * const finix = new Finix(username, password);
   * ```
   */
  constructor(
    username = process.env.FINIX_USERNAME,
    password = process.env.FINIX_PASSWORD
  ) {
    if (!username || !password) {
      console.error(`Missing Finix credentials.`);
    }
    this.username = username || "";
    this.password = password || "";
    this.baseUrl =
      process.env.FINIX_BASE_URL || "https://finix.sandbox-payments-api.com";

    // Add trailing slash if the env doesn't end with one.
    if (!this.baseUrl.endsWith("/")) {
      this.baseUrl += "/";
    }
    this.baseUrl = this.baseUrl.endsWith("/") ? this.baseUrl : this.baseUrl;
  }

  /**
   * Helper function for authenticated http requests to
   * @param url Fattmerchant Registration object
   * @param body The body of the request. Set null if not used.
   * @param method The HTTP method to use.
   */
  _http(url, body, method) {
    const config = {
      url,
      method,
      headers: {
        "Content-Type": "application/vnd.json+api",
      },
      auth: {
        username: this.username,
        password: this.password,
      },
      data: body,
    };
    if (method.toLowerCase() !== "get" && method.toLowerCase() !== "delete") {
      config.data = body;
    }
    return axios.request(config).then((res) => res.data);
  }

  /**
   * Creates a Finix Identity object.
   * @param registration Fattmerchant Registration object
   * @param tags A KeyVal tag pair
   * @param processingInfoType
   */
  buildIdentity(
    registration,
    tags = {},
    configuration,
    processingInfoType = "keyed-transactions"
  ) {
    if (registration === null || Object.keys(registration).length === 0) {
      throw { errors: ["The input cannot be null or empty"] };
    }

    let highestTransAmount = registration.highest_trans_amount;

    if (processingInfoType === "shopping-cart") {
      highestTransAmount = registration.largest_shopping_cart_transaction;
    }

    // Check registration contains fields needed for configuration in context.
    const configurationErrors =
      finixUtils.validateRegistrationModelByConfiguration(
        registration,
        configuration
      );

    if (configurationErrors.length > 0) {
      throw { errors: configurationErrors };
    }

    const isSoleProp =
      get(registration, "company_type") === "S" ||
      get(registration, "company_type") === "Sole Proprietor";

    const highestCardTransAmount = finixUtils.formatNumeric(
      highestTransAmount ?? 0,
      false
    );

    const highestAchTransAmount = finixUtils.formatNumeric(
      +getIfNotNull(registration, "largest_ach_transaction", 0),
      false
    );
    // prettier-ignore
    const identity = {
      business_name: get(registration, 'business_legal_name'),
      doing_business_as: get(registration, 'business_dba'),
      business_type: finixUtils.getBusinessType(registration),
      business_tax_id: finixUtils.getBusinessTaxId(registration, isSoleProp),
      url: get(registration, "business_website"),
      business_phone: finixUtils.formatNumeric(get(registration, 'business_phone_number', null), true),
      incorporation_date: finixUtils.formatDate(get(registration, "business_open_date")),
      business_address: finixUtils.formatAddress(registration, "business_location_address_"),
      ownership_type: get(registration, 'entity_ownership_type'),
      first_name: get(registration, "first_name"),
      last_name: get(registration, "last_name"),
      title: get(registration, "job_title"),
      tax_id: finixUtils.formatNumeric(get(registration, "user_ssn"), true),
      dob: finixUtils.formatDate(get(registration, "user_dob")),
      phone: finixUtils.formatNumeric(get(registration, "phone_number"), true),
      email: get(registration, "email"),
      personal_address: finixUtils.formatAddress(registration, "owner_address_"),
      annual_card_volume: finixUtils.calculateAnnualVolumeByConfiguration(registration, configuration, processingInfoType),
      max_transaction_amount: Math.max(highestCardTransAmount, highestAchTransAmount) * 100, // select the larger of the two (card and ach) and multiply by 100 to convert to cents
      mcc: get(registration, "mcc", null) || null,
      default_statement_descriptor: get(registration, 'business_dba') ? get(registration, 'business_dba').substring(0, 19) : null,
      principal_percentage_ownership: finixUtils.getOwnershipPercentage(registration),
      has_accepted_credit_cards_previously: finixUtils.getHasAcceptedCardsPreviously(registration),
    };

    const errors = finixUtils.validateIdentity(identity);
    console.error(errors);

    if (errors.length > 0) {
      throw { errors };
    } else {
      // Identity is wrapped on entity key
      // https://developers.finixpayments.com/#create-an-identity-for-a-merchant61
      return {
        entity: identity,
        tags,
      };
    }
  }

  /**
   * Creates a Finix Payment Instrument Object.
   * @param registration Fattmerchant Registration object
   * @param identityId The identity id associated to the bank account
   * @param tags A KeyVal tag pair
   */
  buildPaymentInstrument(registration, identityId, tags = {}) {
    if (registration === null || Object.keys(registration).length === 0) {
      throw { errors: ["The input cannot be null or empty"] };
    }

    // prettier-ignore
    const paymentInstrument = {
      account_number: get(registration, 'bank_account_number'),
      bank_code: get(registration, 'bank_routing_number'),
      name: get(registration, 'bank_account_owner_name'),
      type: 'BANK_ACCOUNT',
      account_type: 'CHECKING',
      identity: identityId,
      tags,
    }

    const errors = finixUtils.validatePaymentInstrument(paymentInstrument);

    if (errors.length > 0) {
      throw { errors };
    } else {
      return paymentInstrument;
    }
  }

  /**
   * The official mapping of data from Omni's `Registration` to Finix API's `Fee Profile`
   * is recorded in the Google spreadsheet `SPEC 003A - Registration - Data Dictionary`.
   * @param registration Fattmerchant Registration object
   * @param applicationId The finix application id
   * @param tags A KeyVal tag pair
   * @returns A payload to create a Finix `Fee Profile`.
   */
  buildFeeProfile(registration, applicationId, tags = {}, configuration) {
    let errors = [];
    if (registration === null || Object.keys(registration).length === 0) {
      throw { errors: ["The input cannot be null or empty"] };
    }

    // if this merchant is a trust account, then the fee profile should be completely zeroed out
    // because we cannot charge fees to a trust account
    // (we will manually reconcile these fees with the relevant operating account later)
    if (registration.pricing_plan?.endsWith("-trust")) {
      /* The official mapping of data from Omni's `Registration` to Finix API's `Fee Profile`
       * is recorded in the Google spreadsheet `SPEC 003A - Registration - Data Dictionary`.
       */

      const feeProfile = {
        application: applicationId,

        charge_interchange: false,
        fixed_fee: 0, // Used for CP or CNP.
        basis_points: 0, // Used for CP or CNP.

        ach_fixed_fee: 0,
        ach_basis_points: 0,

        dispute_inquiry_fixed_fee: 0,
        dispute_fixed_fee: 0,

        visa_basis_points: 0,
        visa_fixed_fee: 0,
        visa_charge_interchange: false,
        visa_assessments_basis_points: 0,
        visa_acquirer_processing_fixed_fee: 0,
        visa_credit_voucher_fixed_fee: 0,
        visa_kilobyte_access_fixed_fee: 0,

        discover_basis_points: 0,
        discover_fixed_fee: 0,
        discover_charge_interchange: false,
        discover_assessments_basis_points: 0,
        discover_data_usage_fixed_fee: 0,
        discover_network_authorization_fixed_fee: 0,

        diners_club_basis_points: 0,
        diners_club_fixed_fee: 0,
        diners_club_charge_interchange: false,

        mastercard_basis_points: 0,
        mastercard_fixed_fee: 0,
        mastercard_charge_interchange: false,
        mastercard_assessments_under1k_basis_points: 0,
        mastercard_assessments_over1k_basis_points: 0,
        mastercard_acquirer_fees_basis_points: 0,

        jcb_basis_points: 0,
        jcb_fixed_fee: 0,
        jcb_charge_interchange: false,

        american_express_basis_points: 0,
        american_express_fixed_fee: 0,
        american_express_charge_interchange: false,
        american_express_assessment_basis_points: 0,

        tags: tags,
      };

      return feeProfile;
    }

    if (!propNotNullable(registration, "plan_txamnt")) {
      errors.push(`"registration.plan_txamnt" cannot be null or empty`);
      throw { errors };
    } else if (!propNotNullable(registration, "plan_dcamnt")) {
      errors.push(`"registration.plan_dcamnt" cannot be null or empty`);
      throw { errors };
    }

    let calculated_fixed_fee = +registration.plan_txamnt * 100;
    let calculated_basis_points = +registration.plan_dcamnt * 100;
    let calculated_amex_fixed_fee =
      +getIfNotNull(
        registration,
        "amex_mid_trans_fee",
        registration.plan_txamnt
      ) * 100;
    let calculated_amex_basis_points =
      +getIfNotNull(
        registration,
        "amex_mid_disc_rate",
        registration.plan_dcamnt
      ) * 100;

    // Remap these 4 fields for the "Core CP" configuration.
    if (configuration === finixUtils.FinixConfigurations.Core_CP) {
      if (!propNotNullable(registration, "cp_transaction_rate")) {
        errors.push(
          `"registration.cp_transaction_rate" cannot be null or empty`
        );
        throw { errors };
      } else if (!propNotNullable(registration, "cp_per_item_rate")) {
        errors.push(`"registration.cp_per_item_rate" cannot be null or empty`);
        throw { errors };
      }

      calculated_fixed_fee =
        +getIfNotNull(registration, "cp_per_item_rate", 0) * 100;
      calculated_basis_points =
        +getIfNotNull(registration, "cp_transaction_rate", 0) * 100;
      calculated_amex_fixed_fee =
        +getIfNotNull(
          registration,
          "cp_amex_per_item_rate",
          registration.cp_per_item_rate
        ) * 100;
      calculated_amex_basis_points =
        +getIfNotNull(
          registration,
          "cp_amex_rate",
          registration.cp_transaction_rate
        ) * 100;
    }

    /* The official mapping of data from Omni's `Registration` to Finix API's `Fee Profile`
     * is recorded in the Google spreadsheet `SPEC 003A - Registration - Data Dictionary`.
     */
    // prettier-ignore
    const feeProfile = {
      application: applicationId,
      charge_interchange: !registration.is_flat_rate,
      fixed_fee: calculated_fixed_fee, // Used for CP or CNP.
      basis_points: calculated_basis_points, // Used for CP or CNP.
      // Set ACH fees as zero in  Instead, OmniGateway will handle calculating ACH transaction fees.
      ach_fixed_fee: 0,
      ach_basis_points: 0,
      american_express_fixed_fee: calculated_amex_fixed_fee,
      american_express_basis_points: calculated_amex_basis_points,
      american_express_charge_interchange: !registration.is_flat_rate,
      dispute_inquiry_fixed_fee: 1500, // $15.00
      dispute_fixed_fee: 2500, // $25.00
      tags: tags
    };

    errors = finixUtils.validateFeeProfile(feeProfile);

    if (errors.length > 0) {
      throw { errors };
    } else {
      return feeProfile;
    }
  }

  createIdentity(applicationId, finixIdentity) {
    const url = `${this.baseUrl}applications/${applicationId}/identities`;
    return this._http(url, finixIdentity, "POST");
  }

  /**
   * Create the Payment Instrument in Finix
   * @param applicationId
   * @param paymentInstrument
   */
  createPaymentInstrument(applicationId, paymentInstrument) {
    const url = `${this.baseUrl}applications/${applicationId}/payment_instruments`;
    return this._http(url, paymentInstrument, "POST");
  }

  /**
   * Create a Fee Profile for a Merchant in Finix
   * @param feeProfile
   */
  createFeeProfile(feeProfile) {
    const url = `${this.baseUrl}fee_profiles`;
    const body = feeProfile;
    return this._http(url, body, "POST");
  }

  /**
   * Get a specific identity from finix
   * @param identityId The ID of the finix identity
   */
  getIdentity(identityId) {
    const url = `${this.baseUrl}identities/${identityId}`;
    return this._http(url, undefined, "GET");
  }

  /**
   * Gets details on a Finix `Application` given an ID.
   * @param applicationId The ID of the Finix `Application` resource.
   */
  getApplication(applicationId) {
    const url = `${this.baseUrl}applications/${applicationId}`;
    return this._http(url, undefined, "GET");
  }

  /**
   * Get 100 applications from finix
   */
  getApplications() {
    //TODO: Finix limit is 100, do pagination
    const url = `${this.baseUrl}applications?limit=100&sort=created_at,desc&sort=id,desc`;
    return this._http(url, undefined, "GET");
  }

  /**
   * Get 100 users from finix
   */
  getUsers() {
    //TODO: Finix limit is 100, do pagination
    const url = `${this.baseUrl}users?limit=100&sort=created_at,desc&sort=id,desc`;
    return this._http(url, undefined, "GET");
  }

  /**
   * Take an identity and provision a merchant for them
   * @param identityId The Finix Identity ID.
   * @param processor 'VANTIV_V1' or 'LITLE_V1'
   * @param tags An Key-Val tag map for
   */
  provisionMerchant(identityId, processor, tags = {}) {
    const url = `${this.baseUrl}identities/${identityId}/merchants`;
    const body = { processor, tags };
    return this._http(url, body, "POST");
  }

  /**
   * Gets details on a Finix `Merchant` given an ID.
   * @param merchantId The ID of the Finix `Merchant` resource.
   */
  getMerchant(merchantId) {
    const url = `${this.baseUrl}merchants/${merchantId}`;
    return this._http(url, undefined, "GET");
  }

  /**
   * Gets details on a Finix `Merchant Profile` given an ID.
   * @param merchantProfileId The ID of the Finix `Merchant Profile` resource.
   */
  getMerchantProfile(merchantProfileId) {
    const url = `${this.baseUrl}merchant_profiles/${merchantProfileId}`;
    return this._http(url, undefined, "GET");
  }

  /**
   * Updates a Finix `Mechant Profile` with a `Fee Profile`
   * @param merchantProfileId The ID of the Finix `Merchant Profile` resource.
   * @param feeProfileId The ID of the Finix `Fee Profile` resource.
   */
  updateMerchantProfileFeeProfile(merchantProfileId, feeProfileId) {
    const url = `${this.baseUrl}merchant_profiles/${merchantProfileId}`;
    const body = { fee_profile: feeProfileId };
    return this._http(url, body, "PUT");
  }
}

module.exports = Finix;
