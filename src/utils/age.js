function calculateAge(dateOfBirth, atDate = new Date()) {
  const dob = new Date(dateOfBirth);
  let age = atDate.getFullYear() - dob.getFullYear();
  const monthDiff = atDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && atDate.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

module.exports = { calculateAge };
