/**
 * Sanitize and standardize Brazilian phone numbers
 * @param {string|number} phoneNumber - Phone number in various formats
 * @returns {number} - Standardized phone number as a number (e.g., 5551981384673)
 */
const fixPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Convert to string and remove all non-digit characters (including +)
  let cleaned = String(phoneNumber).replace(/\D/g, '');

  // Remove leading zeros if any
  cleaned = cleaned.replace(/^0+/, '');

  // Brazilian phone numbers must start with 55 (country code)
  if (!cleaned.startsWith('55')) {
    throw new Error('Phone number must start with country code 55 (Brazil)');
  }

  // Expected format: 55 (country) + 2 digits (area code) + 9 digits (number) = 13 digits total
  const EXPECTED_LENGTH = 13;
  const COUNTRY_CODE_LENGTH = 2; // 55
  const AREA_CODE_LENGTH = 2;

  if (cleaned.length === EXPECTED_LENGTH) {
    // Already correct length, return as number
    return parseInt(cleaned, 10);
  }

  if (cleaned.length === EXPECTED_LENGTH - 1) {
    // Missing one digit (the 9 before the local number)
    // Format: 55 + [2 area code digits] + [8 digits] → need to add 9
    // Insert 9 after the area code (after position 4: 55 + 2 area code digits)
    const countryCode = cleaned.slice(0, COUNTRY_CODE_LENGTH); // 55
    const areaCode = cleaned.slice(COUNTRY_CODE_LENGTH, COUNTRY_CODE_LENGTH + AREA_CODE_LENGTH); // 2 digits
    const localNumber = cleaned.slice(COUNTRY_CODE_LENGTH + AREA_CODE_LENGTH); // remaining digits

    // Add 9 in front of local number if it's 8 digits
    const fullLocalNumber = localNumber.length === 8 ? `9${localNumber}` : localNumber;
    const standardized = `${countryCode}${areaCode}${fullLocalNumber}`;

    return parseInt(standardized, 10);
  }

  if (cleaned.length < EXPECTED_LENGTH - 1) {
    throw new Error(`Phone number too short: expected ${EXPECTED_LENGTH} digits, got ${cleaned.length}`);
  }

  if (cleaned.length > EXPECTED_LENGTH) {
    throw new Error(`Phone number too long: expected ${EXPECTED_LENGTH} digits, got ${cleaned.length}`);
  }

  return parseInt(cleaned, 10);
};

module.exports = {
  fixPhoneNumber,
};
