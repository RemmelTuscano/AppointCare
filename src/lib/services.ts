/**
 * Medical Services by Specialization
 * Default services offered by each medical specialty
 * Includes multiple naming variations to handle different database formats
 */

export const SERVICES_BY_SPECIALIZATION: Record<string, string[]> = {
  // Dentistry Variations
  'Dentistry': [
    'Cleaning & Checkup',
    'Filling',
    'Root Canal',
    'Extraction',
    'Whitening',
    'Braces Adjustment',
    'Dental Implant',
    'Crown Placement',
  ],
  'Dentist': [
    'Cleaning & Checkup',
    'Filling',
    'Root Canal',
    'Extraction',
    'Whitening',
    'Braces Adjustment',
    'Dental Implant',
    'Crown Placement',
  ],
  'Dental Surgery': [
    'Cleaning & Checkup',
    'Filling',
    'Root Canal',
    'Extraction',
    'Whitening',
    'Braces Adjustment',
    'Dental Implant',
    'Crown Placement',
  ],

  // Pediatrics Variations
  'Pediatrics': [
    'Well-child Checkup',
    'Vaccination',
    'Fever & Cold Treatment',
    'Growth Monitoring',
    'Ear Infection Treatment',
    'Skin Rash Assessment',
    'Behavioral Consultation',
    'Allergy Testing',
  ],
  'Pediatrician': [
    'Well-child Checkup',
    'Vaccination',
    'Fever & Cold Treatment',
    'Growth Monitoring',
    'Ear Infection Treatment',
    'Skin Rash Assessment',
    'Behavioral Consultation',
    'Allergy Testing',
  ],
  'Pediatricians': [
    'Well-child Checkup',
    'Vaccination',
    'Fever & Cold Treatment',
    'Growth Monitoring',
    'Ear Infection Treatment',
    'Skin Rash Assessment',
    'Behavioral Consultation',
    'Allergy Testing',
  ],
  'Pediatric Medicine': [
    'Well-child Checkup',
    'Vaccination',
    'Fever & Cold Treatment',
    'Growth Monitoring',
    'Ear Infection Treatment',
    'Skin Rash Assessment',
    'Behavioral Consultation',
    'Allergy Testing',
  ],

  // Obstetrics & Gynecology Variations
  'Obstetrics & Gynecology': [
    'Prenatal Checkup',
    'Ultrasound',
    'Labor & Delivery',
    'Postpartum Care',
    'Gynecology Checkup',
    'Contraception Consultation',
    'Fertility Treatment',
    'Menopause Management',
  ],
  'Obstetrics and Gynecology': [
    'Prenatal Checkup',
    'Ultrasound',
    'Labor & Delivery',
    'Postpartum Care',
    'Gynecology Checkup',
    'Contraception Consultation',
    'Fertility Treatment',
    'Menopause Management',
  ],
  'OB-GYN': [
    'Prenatal Checkup',
    'Ultrasound',
    'Labor & Delivery',
    'Postpartum Care',
    'Gynecology Checkup',
    'Contraception Consultation',
    'Fertility Treatment',
    'Menopause Management',
  ],
  'OBGYN': [
    'Prenatal Checkup',
    'Ultrasound',
    'Labor & Delivery',
    'Postpartum Care',
    'Gynecology Checkup',
    'Contraception Consultation',
    'Fertility Treatment',
    'Menopause Management',
  ],
  'Gynecology': [
    'Prenatal Checkup',
    'Ultrasound',
    'Labor & Delivery',
    'Postpartum Care',
    'Gynecology Checkup',
    'Contraception Consultation',
    'Fertility Treatment',
    'Menopause Management',
  ],
  'Obstetrician': [
    'Prenatal Checkup',
    'Ultrasound',
    'Labor & Delivery',
    'Postpartum Care',
    'Gynecology Checkup',
    'Contraception Consultation',
    'Fertility Treatment',
    'Menopause Management',
  ],

  // Cardiology Variations
  'Cardiology': [
    'Cardiac Checkup',
    'EKG Test',
    'Echocardiogram',
    'Blood Pressure Monitoring',
    'Stress Test',
    'Cholesterol Management',
    'Heart Murmur Evaluation',
    'Arrhythmia Treatment',
  ],
  'Cardiologist': [
    'Cardiac Checkup',
    'EKG Test',
    'Echocardiogram',
    'Blood Pressure Monitoring',
    'Stress Test',
    'Cholesterol Management',
    'Heart Murmur Evaluation',
    'Arrhythmia Treatment',
  ],
  'Cardiac Surgery': [
    'Cardiac Checkup',
    'EKG Test',
    'Echocardiogram',
    'Blood Pressure Monitoring',
    'Stress Test',
    'Cholesterol Management',
    'Heart Murmur Evaluation',
    'Arrhythmia Treatment',
  ],
  'Heart Disease': [
    'Cardiac Checkup',
    'EKG Test',
    'Echocardiogram',
    'Blood Pressure Monitoring',
    'Stress Test',
    'Cholesterol Management',
    'Heart Murmur Evaluation',
    'Arrhythmia Treatment',
  ],

  // Dermatology Variations
  'Dermatology': [
    'Skin Examination',
    'Acne Treatment',
    'Eczema & Psoriasis',
    'Mole Removal',
    'Wart Treatment',
    'Laser Therapy',
    'Chemical Peel',
    'Anti-aging Consultation',
  ],
  'Dermatologist': [
    'Skin Examination',
    'Acne Treatment',
    'Eczema & Psoriasis',
    'Mole Removal',
    'Wart Treatment',
    'Laser Therapy',
    'Chemical Peel',
    'Anti-aging Consultation',
  ],
  'Skin Diseases': [
    'Skin Examination',
    'Acne Treatment',
    'Eczema & Psoriasis',
    'Mole Removal',
    'Wart Treatment',
    'Laser Therapy',
    'Chemical Peel',
    'Anti-aging Consultation',
  ],

  // Orthopedics Variations
  'Orthopedics': [
    'Bone & Joint Examination',
    'X-ray & Imaging',
    'Fracture Treatment',
    'Arthritis Management',
    'ACL Reconstruction',
    'Physical Therapy',
    'Sports Injury Treatment',
    'Joint Replacement Consultation',
  ],
  'Orthopedist': [
    'Bone & Joint Examination',
    'X-ray & Imaging',
    'Fracture Treatment',
    'Arthritis Management',
    'ACL Reconstruction',
    'Physical Therapy',
    'Sports Injury Treatment',
    'Joint Replacement Consultation',
  ],
  'Orthopedic Surgery': [
    'Bone & Joint Examination',
    'X-ray & Imaging',
    'Fracture Treatment',
    'Arthritis Management',
    'ACL Reconstruction',
    'Physical Therapy',
    'Sports Injury Treatment',
    'Joint Replacement Consultation',
  ],
  'Bone & Joint': [
    'Bone & Joint Examination',
    'X-ray & Imaging',
    'Fracture Treatment',
    'Arthritis Management',
    'ACL Reconstruction',
    'Physical Therapy',
    'Sports Injury Treatment',
    'Joint Replacement Consultation',
  ],

  // General Practice Variations
  'General Practice': [
    'General Checkup',
    'Blood Test',
    'Blood Pressure Check',
    'Common Cold Treatment',
    'Medication Prescription',
    'Health Certificate',
    'Vaccination',
    'Chronic Disease Management',
  ],
  'General Practitioner': [
    'General Checkup',
    'Blood Test',
    'Blood Pressure Check',
    'Common Cold Treatment',
    'Medication Prescription',
    'Health Certificate',
    'Vaccination',
    'Chronic Disease Management',
  ],
  'Family Medicine': [
    'General Checkup',
    'Blood Test',
    'Blood Pressure Check',
    'Common Cold Treatment',
    'Medication Prescription',
    'Health Certificate',
    'Vaccination',
    'Chronic Disease Management',
  ],
  'Internal Medicine': [
    'General Checkup',
    'Blood Test',
    'Blood Pressure Check',
    'Common Cold Treatment',
    'Medication Prescription',
    'Health Certificate',
    'Vaccination',
    'Chronic Disease Management',
  ],
  'General Doctor': [
    'General Checkup',
    'Blood Test',
    'Blood Pressure Check',
    'Common Cold Treatment',
    'Medication Prescription',
    'Health Certificate',
    'Vaccination',
    'Chronic Disease Management',
  ],
};

/**
 * Get services for a specific specialization
 * @param specialization - The medical specialization
 * @returns Array of services offered by that specialization
 */
export function getServicesBySpecialization(specialization: string | null | undefined): string[] {
  if (!specialization) return [];
  
  // Try exact match first
  if (specialization in SERVICES_BY_SPECIALIZATION) {
    return SERVICES_BY_SPECIALIZATION[specialization];
  }
  
  // Try case-insensitive match
  const normalized = specialization.toLowerCase().trim();
  for (const key of Object.keys(SERVICES_BY_SPECIALIZATION)) {
    if (key.toLowerCase() === normalized) {
      return SERVICES_BY_SPECIALIZATION[key];
    }
  }
  
  // No match found
  return [];
}

/**
 * Get all unique specializations that have services
 * @returns Array of specializations
 */
export function getAllSpecializations(): string[] {
  return Object.keys(SERVICES_BY_SPECIALIZATION);
}

/**
 * Check if a specialization has defined services
 * @param specialization - The medical specialization
 * @returns True if services are defined for this specialization
 */
export function hasServices(specialization: string | null | undefined): boolean {
  if (!specialization) return false;
  return specialization in SERVICES_BY_SPECIALIZATION;
}
