const fixPhoneNumber = (phoneNumber) => {
  // Convert phoneNumber to number for proper matching since User model stores it as Number
  const fixedPhoneNumber =
    phoneNumber.length === 13 && phoneNumber.slice(0, 3) === '+55'
      ? `${phoneNumber.slice(1, 5)}9${phoneNumber.slice(5)}`
      : phoneNumber;

  const phoneNumberAsNumber =
    typeof fixedPhoneNumber === 'string' ? parseInt(fixedPhoneNumber.replace(/\D/g, ''), 10) : fixedPhoneNumber;
  return phoneNumberAsNumber;
};

module.exports = {
  fixPhoneNumber,
};
