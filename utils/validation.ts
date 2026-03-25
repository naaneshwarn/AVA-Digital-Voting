export const validateAadhar = (aadhar: string): { isValid: boolean; message: string } => {
  if (!aadhar || aadhar.trim() === '') {
    return { isValid: false, message: "Aadhar number is required." };
  }
  
  const aadharRegex = /^[2-9]\d{11}$/;
  
  if (!aadharRegex.test(aadhar)) {
    return { isValid: false, message: "Invalid Aadhar. Must be 12 digits and not start with 0 or 1." };
  }

  return { isValid: true, message: "" };
};

export const validateVoterId = (voterId: string): { isValid: boolean; message: string } => {
  if (!voterId || voterId.trim() === '') {
    return { isValid: false, message: "Voter ID is required." };
  }

  // Common format: 3 letters followed by 7 numbers.
  const voterIdRegex = /^[A-Z]{3}\d{7}$/;
  
  if (!voterIdRegex.test(voterId)) {
    return { isValid: false, message: "Invalid Voter ID. Expected format: ABC1234567." };
  }
  
  return { isValid: true, message: "" };
};
