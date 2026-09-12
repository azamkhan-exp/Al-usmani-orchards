import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';
import crypto from 'node:crypto';

export interface PakistanLocation {
  id: string;
  province: string;
  division?: string | null;
  district: string;
  tehsil?: string | null;
  city: string;
  area?: string | null;
  postal_code?: string | null;
  delivery_fee: number;
  estimated_delivery_days: string;
  cod_available: number;
  is_serviceable: number;
  is_active: number;
  courier_code?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LocationFilters {
  search?: string;
  province?: string;
  district?: string;
  serviceableOnly?: boolean;
  activeOnly?: boolean;
  codOnly?: boolean;
  page?: number;
  limit?: number;
}

// Master Seed Data for Pakistan Locations
export const MASTER_PAKISTAN_LOCATIONS = [
  // --- PUNJAB ---
  { province: 'Punjab', division: 'Multan', district: 'Multan', city: 'Multan', area: 'Multan City & Cantt', postal_code: '60000', delivery_fee: 250, estimated_delivery_days: 'Same-Day / 24 Hours Dawn Dispatch', cod_available: 1, is_serviceable: 1, sort_order: 1 },
  { province: 'Punjab', division: 'Multan', district: 'Multan', city: 'Shujabad', area: 'Shujabad Orchards Corridor', postal_code: '60300', delivery_fee: 200, estimated_delivery_days: 'Same-Day Grove Delivery', cod_available: 1, is_serviceable: 1, sort_order: 2 },
  { province: 'Punjab', division: 'Multan', district: 'Multan', city: 'Jalalpur Pirwala', area: 'Jalalpur Town', postal_code: '60400', delivery_fee: 250, estimated_delivery_days: '24 Hours', cod_available: 1, is_serviceable: 1, sort_order: 3 },
  { province: 'Punjab', division: 'Multan', district: 'Khanewal', city: 'Khanewal', area: 'Khanewal City', postal_code: '58150', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 4 },
  { province: 'Punjab', division: 'Multan', district: 'Khanewal', city: 'Mian Channu', area: 'Mian Channu Town', postal_code: '58000', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 5 },
  { province: 'Punjab', division: 'Multan', district: 'Vehari', city: 'Vehari', area: 'Vehari City', postal_code: '61100', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 6 },
  { province: 'Punjab', division: 'Multan', district: 'Vehari', city: 'Burewala', area: 'Burewala City', postal_code: '61010', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 7 },
  { province: 'Punjab', division: 'Multan', district: 'Lodhran', city: 'Lodhran', area: 'Lodhran City', postal_code: '59320', delivery_fee: 250, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 8 },

  { province: 'Punjab', division: 'Lahore', district: 'Lahore', city: 'Lahore', area: 'Gulberg & Model Town', postal_code: '54000', delivery_fee: 350, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 10 },
  { province: 'Punjab', division: 'Lahore', district: 'Lahore', city: 'Lahore', area: 'DHA Phase 1-9 & Cantt', postal_code: '54792', delivery_fee: 350, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 11 },
  { province: 'Punjab', division: 'Lahore', district: 'Lahore', city: 'Lahore', area: 'Johar Town & Wapda Town', postal_code: '54770', delivery_fee: 350, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 12 },
  { province: 'Punjab', division: 'Lahore', district: 'Lahore', city: 'Lahore', area: 'Bahria Town & Lake City', postal_code: '53720', delivery_fee: 350, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 13 },
  { province: 'Punjab', division: 'Lahore', district: 'Kasur', city: 'Kasur', area: 'Kasur City', postal_code: '55050', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 14 },
  { province: 'Punjab', division: 'Lahore', district: 'Sheikhupura', city: 'Sheikhupura', area: 'Sheikhupura City', postal_code: '39350', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 15 },
  { province: 'Punjab', division: 'Lahore', district: 'Nankana Sahib', city: 'Nankana Sahib', area: 'Nankana City', postal_code: '39100', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 16 },

  { province: 'Punjab', division: 'Rawalpindi', district: 'Rawalpindi', city: 'Rawalpindi', area: 'Saddar & Cantt', postal_code: '46000', delivery_fee: 400, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 20 },
  { province: 'Punjab', division: 'Rawalpindi', district: 'Rawalpindi', city: 'Rawalpindi', area: 'Bahria Town Phase 1-8', postal_code: '46220', delivery_fee: 400, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 21 },
  { province: 'Punjab', division: 'Rawalpindi', district: 'Rawalpindi', city: 'Rawalpindi', area: 'DHA Islamabad-Rawalpindi', postal_code: '46000', delivery_fee: 400, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 22 },
  { province: 'Punjab', division: 'Rawalpindi', district: 'Murree', city: 'Murree', area: 'Mall Road & Hills', postal_code: '47150', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 23 },
  { province: 'Punjab', division: 'Rawalpindi', district: 'Attock', city: 'Attock', area: 'Attock City & Cantt', postal_code: '43600', delivery_fee: 400, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 24 },
  { province: 'Punjab', division: 'Rawalpindi', district: 'Chakwal', city: 'Chakwal', area: 'Chakwal City', postal_code: '48800', delivery_fee: 400, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 25 },
  { province: 'Punjab', division: 'Rawalpindi', district: 'Jhelum', city: 'Jhelum', area: 'Jhelum City & Cantt', postal_code: '49600', delivery_fee: 400, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 26 },

  { province: 'Punjab', division: 'Faisalabad', district: 'Faisalabad', city: 'Faisalabad', area: 'Civil Lines & D Ground', postal_code: '38000', delivery_fee: 350, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 30 },
  { province: 'Punjab', division: 'Faisalabad', district: 'Jhang', city: 'Jhang', area: 'Jhang City', postal_code: '35200', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 31 },
  { province: 'Punjab', division: 'Faisalabad', district: 'Toba Tek Singh', city: 'Toba Tek Singh', area: 'Toba City', postal_code: '36050', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 32 },
  { province: 'Punjab', division: 'Faisalabad', district: 'Chiniot', city: 'Chiniot', area: 'Chiniot City', postal_code: '35400', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 33 },

  { province: 'Punjab', division: 'Gujranwala', district: 'Gujranwala', city: 'Gujranwala', area: 'Model Town & Cantt', postal_code: '52250', delivery_fee: 350, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 40 },
  { province: 'Punjab', division: 'Gujranwala', district: 'Sialkot', city: 'Sialkot', area: 'Cantt & Paris Road', postal_code: '51310', delivery_fee: 350, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 41 },
  { province: 'Punjab', division: 'Gujranwala', district: 'Gujrat', city: 'Gujrat', area: 'Gujrat City', postal_code: '50700', delivery_fee: 350, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 42 },
  { province: 'Punjab', division: 'Gujranwala', district: 'Hafizabad', city: 'Hafizabad', area: 'Hafizabad City', postal_code: '52110', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 43 },
  { province: 'Punjab', division: 'Gujranwala', district: 'Mandi Bahauddin', city: 'Mandi Bahauddin', area: 'Mandi City', postal_code: '50400', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 44 },
  { province: 'Punjab', division: 'Gujranwala', district: 'Narowal', city: 'Narowal', area: 'Narowal City', postal_code: '51600', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 45 },

  { province: 'Punjab', division: 'Bahawalpur', district: 'Bahawalpur', city: 'Bahawalpur', area: 'Model Town & Cantt', postal_code: '63100', delivery_fee: 250, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 50 },
  { province: 'Punjab', division: 'Bahawalpur', district: 'Bahawalnagar', city: 'Bahawalnagar', area: 'Bahawalnagar City', postal_code: '62300', delivery_fee: 300, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 51 },
  { province: 'Punjab', division: 'Bahawalpur', district: 'Rahim Yar Khan', city: 'Rahim Yar Khan', area: 'RYK City & Abbasia Town', postal_code: '64200', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 52 },
  { province: 'Punjab', division: 'Bahawalpur', district: 'Rahim Yar Khan', city: 'Sadiqabad', area: 'Sadiqabad City', postal_code: '64350', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 53 },

  { province: 'Punjab', division: 'Sargodha', district: 'Sargodha', city: 'Sargodha', area: 'Satellite Town & Cantt', postal_code: '40100', delivery_fee: 350, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 60 },
  { province: 'Punjab', division: 'Sargodha', district: 'Khushab', city: 'Khushab', area: 'Khushab City & Jauharabad', postal_code: '41000', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 61 },
  { province: 'Punjab', division: 'Sargodha', district: 'Mianwali', city: 'Mianwali', area: 'Mianwali City', postal_code: '42200', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 62 },
  { province: 'Punjab', division: 'Sargodha', district: 'Bhakkar', city: 'Bhakkar', area: 'Bhakkar City', postal_code: '30000', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 63 },

  { province: 'Punjab', division: 'Sahiwal', district: 'Sahiwal', city: 'Sahiwal', area: 'Sahiwal City & Tariq Bin Ziad Colony', postal_code: '57000', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 70 },
  { province: 'Punjab', division: 'Sahiwal', district: 'Okara', city: 'Okara', area: 'Okara City & Cantt', postal_code: '56300', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 71 },
  { province: 'Punjab', division: 'Sahiwal', district: 'Pakpattan', city: 'Pakpattan', area: 'Pakpattan City', postal_code: '57400', delivery_fee: 300, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 72 },

  { province: 'Punjab', division: 'Dera Ghazi Khan', district: 'Dera Ghazi Khan', city: 'Dera Ghazi Khan', area: 'DG Khan City', postal_code: '32200', delivery_fee: 300, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 80 },
  { province: 'Punjab', division: 'Dera Ghazi Khan', district: 'Muzaffargarh', city: 'Muzaffargarh', area: 'Muzaffargarh City', postal_code: '34200', delivery_fee: 250, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 81 },
  { province: 'Punjab', division: 'Dera Ghazi Khan', district: 'Muzaffargarh', city: 'Kot Addu', area: 'Kot Addu Town', postal_code: '34050', delivery_fee: 250, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 82 },
  { province: 'Punjab', division: 'Dera Ghazi Khan', district: 'Layyah', city: 'Layyah', area: 'Layyah City', postal_code: '31200', delivery_fee: 300, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 83 },
  { province: 'Punjab', division: 'Dera Ghazi Khan', district: 'Rajanpur', city: 'Rajanpur', area: 'Rajanpur City', postal_code: '33500', delivery_fee: 350, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 84 },

  // --- ISLAMABAD CAPITAL TERRITORY ---
  { province: 'Islamabad Capital Territory', division: 'Islamabad', district: 'Islamabad', city: 'Islamabad', area: 'F-Sectors (F-6, F-7, F-8, F-10, F-11)', postal_code: '44000', delivery_fee: 400, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 90 },
  { province: 'Islamabad Capital Territory', division: 'Islamabad', district: 'Islamabad', city: 'Islamabad', area: 'G-Sectors & Blue Area', postal_code: '44000', delivery_fee: 400, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 91 },
  { province: 'Islamabad Capital Territory', division: 'Islamabad', district: 'Islamabad', city: 'Islamabad', area: 'E-Sectors & Naval Complex', postal_code: '44000', delivery_fee: 400, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 92 },
  { province: 'Islamabad Capital Territory', division: 'Islamabad', district: 'Islamabad', city: 'Islamabad', area: 'I-Sectors & H-Sectors', postal_code: '44000', delivery_fee: 400, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 93 },
  { province: 'Islamabad Capital Territory', division: 'Islamabad', district: 'Islamabad', city: 'Islamabad', area: 'DHA Phase 2 & Bahria Enclave', postal_code: '45710', delivery_fee: 400, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 94 },
  { province: 'Islamabad Capital Territory', division: 'Islamabad', district: 'Islamabad', city: 'Islamabad', area: 'Bani Gala & Chak Shahzad', postal_code: '45500', delivery_fee: 400, estimated_delivery_days: '24 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 95 },

  // --- SINDH ---
  { province: 'Sindh', division: 'Karachi', district: 'Karachi South', city: 'Karachi', area: 'DHA Phase 1-8 & Clifton', postal_code: '75500', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 100 },
  { province: 'Sindh', division: 'Karachi', district: 'Karachi East', city: 'Karachi', area: 'Gulshan-e-Iqbal & PECHS', postal_code: '75300', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 101 },
  { province: 'Sindh', division: 'Karachi', district: 'Karachi Central', city: 'Karachi', area: 'North Nazimabad & Federal B Area', postal_code: '74600', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 102 },
  { province: 'Sindh', division: 'Karachi', district: 'Malir', city: 'Karachi', area: 'Malir Cantt & Scheme 33', postal_code: '75070', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 103 },
  { province: 'Sindh', division: 'Karachi', district: 'Korangi', city: 'Karachi', area: 'Korangi Industrial & DHA City', postal_code: '74900', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 104 },
  { province: 'Sindh', division: 'Karachi', district: 'Karachi West', city: 'Karachi', area: 'SITE & Orangi Town', postal_code: '75700', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 105 },

  { province: 'Sindh', division: 'Hyderabad', district: 'Hyderabad', city: 'Hyderabad', area: 'Qasimabad, Latifabad & Cantt', postal_code: '71000', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 110 },
  { province: 'Sindh', division: 'Hyderabad', district: 'Jamshoro', city: 'Kotri', area: 'Kotri City & Jamshoro University Town', postal_code: '76120', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 111 },
  { province: 'Sindh', division: 'Hyderabad', district: 'Dadu', city: 'Dadu', area: 'Dadu City', postal_code: '76200', delivery_fee: 450, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 112 },
  { province: 'Sindh', division: 'Hyderabad', district: 'Badin', city: 'Badin', area: 'Badin City', postal_code: '72200', delivery_fee: 450, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 113 },
  { province: 'Sindh', division: 'Hyderabad', district: 'Thatta', city: 'Thatta', area: 'Thatta City', postal_code: '73130', delivery_fee: 450, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 114 },
  { province: 'Sindh', division: 'Hyderabad', district: 'Tando Allahyar', city: 'Tando Allahyar', area: 'Tando Allahyar City', postal_code: '70010', delivery_fee: 450, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 115 },
  { province: 'Sindh', division: 'Hyderabad', district: 'Tando Muhammad Khan', city: 'Tando Muhammad Khan', area: 'TMK City', postal_code: '70220', delivery_fee: 450, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 116 },

  { province: 'Sindh', division: 'Sukkur', district: 'Sukkur', city: 'Sukkur', area: 'Sukkur City & Rohri', postal_code: '65200', delivery_fee: 400, estimated_delivery_days: '24 - 36 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 120 },
  { province: 'Sindh', division: 'Sukkur', district: 'Khairpur', city: 'Khairpur', area: 'Khairpur Mirs', postal_code: '66020', delivery_fee: 400, estimated_delivery_days: '24 - 36 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 121 },
  { province: 'Sindh', division: 'Sukkur', district: 'Ghotki', city: 'Ghotki', area: 'Ghotki City & Daharki', postal_code: '65010', delivery_fee: 350, estimated_delivery_days: '24 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 122 },

  { province: 'Sindh', division: 'Larkana', district: 'Larkana', city: 'Larkana', area: 'Larkana City & VIP Area', postal_code: '77150', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 130 },
  { province: 'Sindh', division: 'Larkana', district: 'Shikarpur', city: 'Shikarpur', area: 'Shikarpur City', postal_code: '78100', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 131 },
  { province: 'Sindh', division: 'Larkana', district: 'Jacobabad', city: 'Jacobabad', area: 'Jacobabad City', postal_code: '79000', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 132 },

  { province: 'Sindh', division: 'Mirpur Khas', district: 'Mirpur Khas', city: 'Mirpur Khas', area: 'Mirpur Khas City', postal_code: '69000', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 140 },
  { province: 'Sindh', division: 'Mirpur Khas', district: 'Umerkot', city: 'Umerkot', area: 'Umerkot City', postal_code: '69100', delivery_fee: 450, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 141 },
  { province: 'Sindh', division: 'Shaheed Benazirabad', district: 'Shaheed Benazirabad', city: 'Nawabshah', area: 'Nawabshah City', postal_code: '67450', delivery_fee: 400, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 142 },

  // --- KHYBER PAKHTUNKHWA ---
  { province: 'Khyber Pakhtunkhwa', division: 'Peshawar', district: 'Peshawar', city: 'Peshawar', area: 'University Town, Hayatabad & Cantt', postal_code: '25000', delivery_fee: 450, estimated_delivery_days: '24 - 36 Hours Cold-Chain Express', cod_available: 1, is_serviceable: 1, sort_order: 150 },
  { province: 'Khyber Pakhtunkhwa', division: 'Peshawar', district: 'Nowshera', city: 'Nowshera', area: 'Nowshera Cantt', postal_code: '24100', delivery_fee: 450, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 151 },
  { province: 'Khyber Pakhtunkhwa', division: 'Peshawar', district: 'Charsadda', city: 'Charsadda', area: 'Charsadda City', postal_code: '24420', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 152 },

  { province: 'Khyber Pakhtunkhwa', division: 'Mardan', district: 'Mardan', city: 'Mardan', area: 'Mardan City & Cantt', postal_code: '23200', delivery_fee: 450, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 155 },
  { province: 'Khyber Pakhtunkhwa', division: 'Mardan', district: 'Swabi', city: 'Swabi', area: 'Swabi City & Topi', postal_code: '23430', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 156 },

  { province: 'Khyber Pakhtunkhwa', division: 'Hazara', district: 'Abbottabad', city: 'Abbottabad', area: 'Mandian, PMA & Cantt', postal_code: '22010', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 160 },
  { province: 'Khyber Pakhtunkhwa', division: 'Hazara', district: 'Haripur', city: 'Haripur', area: 'Haripur City & Hattar', postal_code: '22620', delivery_fee: 450, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 161 },
  { province: 'Khyber Pakhtunkhwa', division: 'Hazara', district: 'Mansehra', city: 'Mansehra', area: 'Mansehra City', postal_code: '21300', delivery_fee: 500, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 162 },

  { province: 'Khyber Pakhtunkhwa', division: 'Malakand', district: 'Swat', city: 'Mingora', area: 'Mingora & Saidu Sharif', postal_code: '19130', delivery_fee: 500, estimated_delivery_days: '48 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 165 },
  { province: 'Khyber Pakhtunkhwa', division: 'Kohat', district: 'Kohat', city: 'Kohat', area: 'Kohat City & Cantt', postal_code: '26000', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 170 },
  { province: 'Khyber Pakhtunkhwa', division: 'Dera Ismail Khan', district: 'Dera Ismail Khan', city: 'Dera Ismail Khan', area: 'DI Khan City & Cantt', postal_code: '29050', delivery_fee: 400, estimated_delivery_days: '24 - 36 Hours', cod_available: 1, is_serviceable: 1, sort_order: 175 },
  { province: 'Khyber Pakhtunkhwa', division: 'Bannu', district: 'Bannu', city: 'Bannu', area: 'Bannu City', postal_code: '28100', delivery_fee: 500, estimated_delivery_days: '48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 176 },

  // --- BALOCHISTAN ---
  { province: 'Balochistan', division: 'Quetta', district: 'Quetta', city: 'Quetta', area: 'Jinnah Road, Cantt & Model Town', postal_code: '87300', delivery_fee: 500, estimated_delivery_days: '48 Hours Air/Express Cold-Chain', cod_available: 1, is_serviceable: 1, sort_order: 180 },
  { province: 'Balochistan', division: 'Makran', district: 'Gwadar', city: 'Gwadar', area: 'Gwadar Port & Freezone Area', postal_code: '91200', delivery_fee: 650, estimated_delivery_days: '48 - 72 Hours Cargo', cod_available: 1, is_serviceable: 1, sort_order: 185 },
  { province: 'Balochistan', division: 'Makran', district: 'Kech', city: 'Turbat', area: 'Turbat City', postal_code: '92600', delivery_fee: 650, estimated_delivery_days: '48 - 72 Hours Cargo', cod_available: 1, is_serviceable: 1, sort_order: 186 },
  { province: 'Balochistan', division: 'Kalat', district: 'Hub', city: 'Hub', area: 'Hub Industrial City', postal_code: '90150', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 190 },
  { province: 'Balochistan', division: 'Kalat', district: 'Khuzdar', city: 'Khuzdar', area: 'Khuzdar City', postal_code: '89100', delivery_fee: 550, estimated_delivery_days: '48 - 72 Hours', cod_available: 1, is_serviceable: 1, sort_order: 191 },
  { province: 'Balochistan', division: 'Sibi', district: 'Sibi', city: 'Sibi', area: 'Sibi City', postal_code: '82000', delivery_fee: 450, estimated_delivery_days: '36 - 48 Hours', cod_available: 1, is_serviceable: 1, sort_order: 195 },

  // --- AZAD JAMMU & KASHMIR ---
  { province: 'Azad Jammu & Kashmir', division: 'Muzaffarabad', district: 'Muzaffarabad', city: 'Muzaffarabad', area: 'Muzaffarabad City & Secretariat Area', postal_code: '13100', delivery_fee: 500, estimated_delivery_days: '36 - 48 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 200 },
  { province: 'Azad Jammu & Kashmir', division: 'Mirpur', district: 'Mirpur', city: 'Mirpur', area: 'Sector F-1 & New Mirpur', postal_code: '10250', delivery_fee: 450, estimated_delivery_days: '24 - 36 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 205 },
  { province: 'Azad Jammu & Kashmir', division: 'Poonch', district: 'Rawalakot', city: 'Rawalakot', area: 'Rawalakot City', postal_code: '12350', delivery_fee: 500, estimated_delivery_days: '48 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 210 },
  { province: 'Azad Jammu & Kashmir', division: 'Mirpur', district: 'Kotli', city: 'Kotli', area: 'Kotli City', postal_code: '11100', delivery_fee: 500, estimated_delivery_days: '48 Hours Express', cod_available: 1, is_serviceable: 1, sort_order: 215 },

  // --- GILGIT-BALTISTAN ---
  { province: 'Gilgit-Baltistan', division: 'Gilgit', district: 'Gilgit', city: 'Gilgit', area: 'Gilgit City & Jutial Cantt', postal_code: '15100', delivery_fee: 650, estimated_delivery_days: '48 - 72 Hours Air Cargo', cod_available: 0, is_serviceable: 1, sort_order: 220 },
  { province: 'Gilgit-Baltistan', division: 'Baltistan', district: 'Skardu', city: 'Skardu', area: 'Skardu Town & Shangrila Valley', postal_code: '16100', delivery_fee: 700, estimated_delivery_days: '48 - 72 Hours Air Cargo', cod_available: 0, is_serviceable: 1, sort_order: 225 },
  { province: 'Gilgit-Baltistan', division: 'Gilgit', district: 'Hunza', city: 'Karimabad', area: 'Aliabad & Karimabad Hunza', postal_code: '15700', delivery_fee: 750, estimated_delivery_days: '3 - 4 Days Priority Cargo', cod_available: 0, is_serviceable: 1, sort_order: 230 }
];

/**
 * Initializes and seeds the pakistan_locations table if empty.
 */
export async function seedPakistanLocations(): Promise<void> {
  const db = getDatabase();
  const countRow = await db.prepare(`SELECT count(*) as c FROM pakistan_locations`).get() as { c: number };
  if (countRow && Number(countRow.c) > 20) {
    return; // Already populated
  }

  const insert = db.prepare(`
    INSERT INTO pakistan_locations (
      id, province, division, district, tehsil, city, area, postal_code,
      delivery_fee, estimated_delivery_days, cod_available, is_serviceable, is_active, sort_order,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `);

  for (const loc of MASTER_PAKISTAN_LOCATIONS) {
    const id = `loc_${crypto.randomUUID()}`;
    await insert.run(
      id,
      loc.province,
      loc.division || null,
      loc.district,
      null,
      loc.city,
      loc.area || null,
      loc.postal_code || null,
      loc.delivery_fee,
      loc.estimated_delivery_days,
      loc.cod_available,
      loc.is_serviceable,
      loc.sort_order
    );
  }
}

/**
 * Get distinct list of provinces/territories.
 */
export async function getProvinces(): Promise<string[]> {
  ensureDatabaseReady();
  const db = getDatabase();
  const rows = await db.prepare(`
    SELECT DISTINCT province 
    FROM pakistan_locations 
    WHERE is_active = 1 
    ORDER BY 
      CASE province
        WHEN 'Punjab' THEN 1
        WHEN 'Islamabad Capital Territory' THEN 2
        WHEN 'Sindh' THEN 3
        WHEN 'Khyber Pakhtunkhwa' THEN 4
        WHEN 'Balochistan' THEN 5
        WHEN 'Azad Jammu & Kashmir' THEN 6
        WHEN 'Gilgit-Baltistan' THEN 7
        ELSE 8
      END
  `).all() as Array<{ province: string }>;

  return rows.map(r => r.province);
}

/**
 * Get distinct districts for a province.
 */
export async function getDistricts(province?: string): Promise<string[]> {
  ensureDatabaseReady();
  const db = getDatabase();
  let query = `SELECT DISTINCT district FROM pakistan_locations WHERE is_active = 1`;
  const params: any[] = [];

  if (province) {
    query += ` AND province = ?`;
    params.push(province);
  }

  query += ` ORDER BY district ASC`;
  const rows = await db.prepare(query).all(...params) as Array<{ district: string }>;
  return rows.map(r => r.district);
}

/**
 * Get cities in a district/province.
 */
export async function getCities(province?: string, district?: string): Promise<Array<{
  id: string;
  city: string;
  area?: string;
  delivery_fee: number;
  estimated_delivery_days: string;
  cod_available: number;
  is_serviceable: number;
}>> {
  ensureDatabaseReady();
  const db = getDatabase();
  let query = `
    SELECT id, city, area, delivery_fee, estimated_delivery_days, cod_available, is_serviceable
    FROM pakistan_locations 
    WHERE is_active = 1
  `;
  const params: any[] = [];

  if (province) {
    query += ` AND province = ?`;
    params.push(province);
  }
  if (district) {
    query += ` AND district = ?`;
    params.push(district);
  }

  query += ` ORDER BY city ASC, area ASC`;
  return await db.prepare(query).all(...params) as any[];
}

/**
 * Validates a submitted checkout location against the database.
 */
export async function validateCheckoutLocation(province: string, district: string, city: string): Promise<{
  valid: boolean;
  serviceable: boolean;
  codAvailable: boolean;
  deliveryFee: number;
  estimatedDays: string;
  error?: string;
}> {
  ensureDatabaseReady();
  const db = getDatabase();

  const match = await db.prepare(`
    SELECT * FROM pakistan_locations 
    WHERE is_active = 1
      AND (
        (LOWER(province) = LOWER(?) AND LOWER(district) = LOWER(?) AND LOWER(city) = LOWER(?))
        OR (LOWER(city) = LOWER(?))
      )
    ORDER BY is_serviceable DESC, sort_order ASC
    LIMIT 1
  `).get(province, district, city, city) as PakistanLocation | undefined;

  if (!match) {
    // Graceful fallback for unlisted rural locations: standard regional rate
    return {
      valid: true,
      serviceable: true,
      codAvailable: true,
      deliveryFee: 350,
      estimatedDays: '36 - 48 Hours Standard Transit'
    };
  }

  return {
    valid: true,
    serviceable: Number(match.is_serviceable) === 1,
    codAvailable: Number(match.cod_available) === 1,
    deliveryFee: Number(match.delivery_fee),
    estimatedDays: match.estimated_delivery_days,
    error: Number(match.is_serviceable) === 0 
      ? 'This location is currently outside our direct express cold-chain network. Please contact our WhatsApp concierge for specialized direct cargo dispatch.' 
      : undefined
  };
}

/**
 * Filtered admin list of locations with pagination.
 */
export async function getLocationsList(filters: LocationFilters = {}): Promise<{
  locations: PakistanLocation[];
  total: number;
  page: number;
  totalPages: number;
  summary: {
    total_locations: number;
    active_count: number;
    serviceable_count: number;
    cod_count: number;
    provinces_count: number;
  };
}> {
  ensureDatabaseReady();
  const db = getDatabase();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 50));
  const offset = (page - 1) * limit;

  let whereClauses: string[] = ['1=1'];
  const params: any[] = [];

  if (filters.search) {
    whereClauses.push(`(city LIKE ? OR district LIKE ? OR province LIKE ? OR area LIKE ? OR postal_code LIKE ?)`);
    const term = `%${filters.search.trim()}%`;
    params.push(term, term, term, term, term);
  }

  if (filters.province) {
    whereClauses.push(`province = ?`);
    params.push(filters.province);
  }

  if (filters.district) {
    whereClauses.push(`district = ?`);
    params.push(filters.district);
  }

  if (filters.serviceableOnly) {
    whereClauses.push(`is_serviceable = 1`);
  }

  if (filters.activeOnly) {
    whereClauses.push(`is_active = 1`);
  }

  if (filters.codOnly) {
    whereClauses.push(`cod_available = 1`);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = await db.prepare(`SELECT count(*) as count FROM pakistan_locations WHERE ${whereSql}`).get(...params) as { count: number };
  const total = countRow ? Number(countRow.count) : 0;

  const locations = await db.prepare(`
    SELECT * FROM pakistan_locations 
    WHERE ${whereSql}
    ORDER BY 
      CASE province
        WHEN 'Punjab' THEN 1
        WHEN 'Islamabad Capital Territory' THEN 2
        WHEN 'Sindh' THEN 3
        WHEN 'Khyber Pakhtunkhwa' THEN 4
        WHEN 'Balochistan' THEN 5
        WHEN 'Azad Jammu & Kashmir' THEN 6
        WHEN 'Gilgit-Baltistan' THEN 7
        ELSE 8
      END,
      district ASC,
      sort_order ASC,
      city ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as PakistanLocation[];

  // Global summary statistics
  const summaryRow = await db.prepare(`
    SELECT 
      count(*) as total_locations,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN is_serviceable = 1 THEN 1 ELSE 0 END) as serviceable_count,
      SUM(CASE WHEN cod_available = 1 THEN 1 ELSE 0 END) as cod_count,
      COUNT(DISTINCT province) as provinces_count
    FROM pakistan_locations
  `).get() as any;

  return {
    locations,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    summary: {
      total_locations: Number(summaryRow?.total_locations || 0),
      active_count: Number(summaryRow?.active_count || 0),
      serviceable_count: Number(summaryRow?.serviceable_count || 0),
      cod_count: Number(summaryRow?.cod_count || 0),
      provinces_count: Number(summaryRow?.provinces_count || 0)
    }
  };
}

/**
 * Creates a new location in the database.
 */
export async function createLocation(data: {
  province: string;
  division?: string;
  district: string;
  tehsil?: string;
  city: string;
  area?: string;
  postal_code?: string;
  delivery_fee?: number;
  estimated_delivery_days?: string;
  cod_available?: boolean;
  is_serviceable?: boolean;
  courier_code?: string;
}): Promise<PakistanLocation> {
  ensureDatabaseReady();
  const db = getDatabase();

  const id = `loc_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO pakistan_locations (
      id, province, division, district, tehsil, city, area, postal_code,
      delivery_fee, estimated_delivery_days, cod_available, is_serviceable, is_active,
      courier_code, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 1,
      ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `).run(
    id,
    data.province.trim(),
    data.division?.trim() || null,
    data.district.trim(),
    data.tehsil?.trim() || null,
    data.city.trim(),
    data.area?.trim() || null,
    data.postal_code?.trim() || null,
    data.delivery_fee ?? 350,
    data.estimated_delivery_days?.trim() || '24 - 48 Hours',
    data.cod_available !== false ? 1 : 0,
    data.is_serviceable !== false ? 1 : 0,
    data.courier_code?.trim() || null
  );

  return await db.prepare(`SELECT * FROM pakistan_locations WHERE id = ?`).get(id) as PakistanLocation;
}

/**
 * Updates an existing location.
 */
export async function updateLocation(id: string, data: Partial<PakistanLocation>): Promise<boolean> {
  ensureDatabaseReady();
  const db = getDatabase();

  const existing = await db.prepare(`SELECT id FROM pakistan_locations WHERE id = ?`).get(id);
  if (!existing) return false;

  const fields: string[] = [];
  const params: any[] = [];

  if (data.province !== undefined) { fields.push(`province = ?`); params.push(data.province); }
  if (data.division !== undefined) { fields.push(`division = ?`); params.push(data.division); }
  if (data.district !== undefined) { fields.push(`district = ?`); params.push(data.district); }
  if (data.tehsil !== undefined) { fields.push(`tehsil = ?`); params.push(data.tehsil); }
  if (data.city !== undefined) { fields.push(`city = ?`); params.push(data.city); }
  if (data.area !== undefined) { fields.push(`area = ?`); params.push(data.area); }
  if (data.postal_code !== undefined) { fields.push(`postal_code = ?`); params.push(data.postal_code); }
  if (data.delivery_fee !== undefined) { fields.push(`delivery_fee = ?`); params.push(Number(data.delivery_fee)); }
  if (data.estimated_delivery_days !== undefined) { fields.push(`estimated_delivery_days = ?`); params.push(data.estimated_delivery_days); }
  if (data.cod_available !== undefined) { fields.push(`cod_available = ?`); params.push(data.cod_available ? 1 : 0); }
  if (data.is_serviceable !== undefined) { fields.push(`is_serviceable = ?`); params.push(data.is_serviceable ? 1 : 0); }
  if (data.is_active !== undefined) { fields.push(`is_active = ?`); params.push(data.is_active ? 1 : 0); }
  if (data.courier_code !== undefined) { fields.push(`courier_code = ?`); params.push(data.courier_code); }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  await db.prepare(`UPDATE pakistan_locations SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return true;
}

/**
 * Soft deactivates a location instead of hard deleting it to preserve order history.
 */
export async function softDeactivateLocation(id: string): Promise<boolean> {
  ensureDatabaseReady();
  const db = getDatabase();
  const res = await db.prepare(`UPDATE pakistan_locations SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
  return (res as any).changes > 0;
}
