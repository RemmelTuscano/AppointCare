-- Create services table for storing available services by specialization
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  specialization TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint to prevent duplicate services for same specialization
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_specialization_name 
ON services(specialization, LOWER(name));

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Services are viewable by everyone"
  ON services FOR SELECT USING (TRUE);

-- Insert default services for each specialization
-- Dentistry services
INSERT INTO services (specialization, name, description) VALUES
('Dentistry', 'Cleaning & Checkup', 'Professional dental cleaning and thorough examination'),
('Dentistry', 'Filling', 'Cavity treatment with tooth-colored restoration'),
('Dentistry', 'Root Canal', 'Treatment for infected or damaged tooth pulp'),
('Dentistry', 'Extraction', 'Safe tooth removal procedure'),
('Dentistry', 'Whitening', 'Teeth whitening and cosmetic brightening'),
('Dentistry', 'Braces Adjustment', 'Orthodontic braces adjustment and maintenance'),
('Dentistry', 'Dental Implant', 'Permanent tooth replacement solution'),
('Dentistry', 'Crown Placement', 'Tooth crown application and cementation')
ON CONFLICT (specialization, LOWER(name)) DO NOTHING;

-- Pediatrics services
INSERT INTO services (specialization, name, description) VALUES
('Pediatrics', 'Well-child Checkup', 'Regular health screening and development assessment'),
('Pediatrics', 'Vaccination', 'Immunization shots and booster vaccines'),
('Pediatrics', 'Fever & Cold Treatment', 'Management of common childhood illnesses'),
('Pediatrics', 'Growth Monitoring', 'Height, weight, and developmental tracking'),
('Pediatrics', 'Ear Infection Treatment', 'Diagnosis and treatment of otitis media'),
('Pediatrics', 'Skin Rash Assessment', 'Evaluation and treatment of dermatological conditions'),
('Pediatrics', 'Behavioral Consultation', 'Guidance on child behavior and development'),
('Pediatrics', 'Allergy Testing', 'Identification of allergies and sensitivities')
ON CONFLICT (specialization, LOWER(name)) DO NOTHING;

-- Obstetrics & Gynecology services
INSERT INTO services (specialization, name, description) VALUES
('Obstetrics & Gynecology', 'Prenatal Checkup', 'Pregnancy monitoring and fetal assessment'),
('Obstetrics & Gynecology', 'Ultrasound', 'Prenatal and gynecological ultrasound imaging'),
('Obstetrics & Gynecology', 'Labor & Delivery', 'Childbirth assistance and delivery care'),
('Obstetrics & Gynecology', 'Postpartum Care', 'Recovery and follow-up after childbirth'),
('Obstetrics & Gynecology', 'Gynecology Checkup', 'Annual gynecological examination'),
('Obstetrics & Gynecology', 'Contraception Consultation', 'Birth control options and counseling'),
('Obstetrics & Gynecology', 'Fertility Treatment', 'Evaluation and treatment of infertility'),
('Obstetrics & Gynecology', 'Menopause Management', 'Hormone therapy and symptom management')
ON CONFLICT (specialization, LOWER(name)) DO NOTHING;

-- Cardiology services
INSERT INTO services (specialization, name, description) VALUES
('Cardiology', 'Cardiac Checkup', 'Heart health examination and risk assessment'),
('Cardiology', 'EKG Test', 'Electrocardiogram for heart rhythm analysis'),
('Cardiology', 'Echocardiogram', 'Ultrasound imaging of the heart'),
('Cardiology', 'Blood Pressure Monitoring', 'Hypertension management and follow-up'),
('Cardiology', 'Stress Test', 'Exercise testing to assess cardiac function'),
('Cardiology', 'Cholesterol Management', 'Lipid profile testing and medication'),
('Cardiology', 'Heart Murmur Evaluation', 'Assessment of abnormal heart sounds'),
('Cardiology', 'Arrhythmia Treatment', 'Diagnosis and management of irregular heartbeat')
ON CONFLICT (specialization, LOWER(name)) DO NOTHING;

-- Dermatology services
INSERT INTO services (specialization, name, description) VALUES
('Dermatology', 'Skin Examination', 'Comprehensive skin assessment and consultation'),
('Dermatology', 'Acne Treatment', 'Professional acne management and skincare'),
('Dermatology', 'Eczema & Psoriasis', 'Treatment of chronic skin conditions'),
('Dermatology', 'Mole Removal', 'Safe removal of benign skin growths'),
('Dermatology', 'Wart Treatment', 'Removal of warts using various techniques'),
('Dermatology', 'Laser Therapy', 'Advanced laser treatment for skin conditions'),
('Dermatology', 'Chemical Peel', 'Skin rejuvenation treatment'),
('Dermatology', 'Anti-aging Consultation', 'Wrinkle reduction and skin rejuvenation')
ON CONFLICT (specialization, LOWER(name)) DO NOTHING;

-- Orthopedics services
INSERT INTO services (specialization, name, description) VALUES
('Orthopedics', 'Bone & Joint Examination', 'Assessment of musculoskeletal issues'),
('Orthopedics', 'X-ray & Imaging', 'Diagnostic imaging for bone and joint problems'),
('Orthopedics', 'Fracture Treatment', 'Setting and immobilization of broken bones'),
('Orthopedics', 'Arthritis Management', 'Treatment and management of joint arthritis'),
('Orthopedics', 'ACL Reconstruction', 'Surgical repair of knee ligament tears'),
('Orthopedics', 'Physical Therapy', 'Rehabilitation and strengthening exercises'),
('Orthopedics', 'Sports Injury Treatment', 'Management of athletic injuries'),
('Orthopedics', 'Joint Replacement Consultation', 'Assessment for hip or knee replacement')
ON CONFLICT (specialization, LOWER(name)) DO NOTHING;

-- General Practice services
INSERT INTO services (specialization, name, description) VALUES
('General Practice', 'General Checkup', 'Comprehensive health examination and screening'),
('General Practice', 'Blood Test', 'Laboratory blood analysis and testing'),
('General Practice', 'Blood Pressure Check', 'Hypertension monitoring and management'),
('General Practice', 'Common Cold Treatment', 'Treatment of colds, flu, and respiratory issues'),
('General Practice', 'Medication Prescription', 'Prescription and medication management'),
('General Practice', 'Health Certificate', 'Medical certification for school or work'),
('General Practice', 'Vaccination', 'Adult immunization and booster shots'),
('General Practice', 'Chronic Disease Management', 'Management of diabetes, asthma, and other conditions')
ON CONFLICT (specialization, LOWER(name)) DO NOTHING;
