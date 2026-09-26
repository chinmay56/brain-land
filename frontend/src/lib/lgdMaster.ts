export interface LgdTehsil {
  code: string;
  en: string;
  mr: string;
  label: string;
}

export interface LgdDistrict {
  code: string;
  en: string;
  mr: string;
  label: string;
  tehsils: LgdTehsil[];
}

export const LGD_MAHARASHTRA_DISTRICTS: LgdDistrict[] = [
  {
    code: '496',
    en: 'Jalgaon',
    mr: 'जळगाव',
    label: 'Jalgaon',
    tehsils: [
      { code: '4172', en: 'Jalgaon', mr: 'जळगाव', label: 'Jalgaon' },
      { code: '4173', en: 'Bhusawal', mr: 'भुसावळ', label: 'Bhusawal' },
      { code: '4174', en: 'Chalisgaon', mr: 'चाळीसगाव', label: 'Chalisgaon' },
      { code: '4175', en: 'Amalner', mr: 'अमळनेर', label: 'Amalner' },
      { code: '4176', en: 'Yawal', mr: 'यावल', label: 'Yawal' },
      { code: '4177', en: 'Raver', mr: 'रावेर', label: 'Raver' },
      { code: '4178', en: 'Pachora', mr: 'पाचोरा', label: 'Pachora' },
      { code: '4179', en: 'Jamner', mr: 'जामनेर', label: 'Jamner' },
      { code: '4180', en: 'Parola', mr: 'पारोळा', label: 'Parola' },
      { code: '4181', en: 'Erandol', mr: 'एरंडोल', label: 'Erandol' },
      { code: '4182', en: 'Dharangaon', mr: 'धरणगाव', label: 'Dharangaon' },
      { code: '4183', en: 'Bhadgaon', mr: 'भडगाव', label: 'Bhadgaon' },
      { code: '4184', en: 'Bodwad', mr: 'बोदवड', label: 'Bodwad' },
      { code: '4185', en: 'Muktainagar', mr: 'मुक्ताईनगर', label: 'Muktainagar' }
    ]
  },
  {
    code: '521',
    en: 'Pune',
    mr: 'पुणे',
    label: 'Pune',
    tehsils: [
      { code: '4156', en: 'Haveli', mr: 'हवेली', label: 'Haveli' },
      { code: '4157', en: 'Baramati', mr: 'बारामती', label: 'Baramati' },
      { code: '4158', en: 'Khed (Rajgurunagar)', mr: 'खेड (राजगुरुनगर)', label: 'Khed' },
      { code: '4159', en: 'Shirur', mr: 'शिरूर', label: 'Shirur' },
      { code: '4160', en: 'Maval', mr: 'मावळ', label: 'Maval' },
      { code: '4161', en: 'Junnar', mr: 'जुन्नर', label: 'Junnar' },
      { code: '4162', en: 'Ambegaon', mr: 'आंबेगाव', label: 'Ambegaon' },
      { code: '4163', en: 'Daund', mr: 'दौंड', label: 'Daund' },
      { code: '4164', en: 'Indapur', mr: 'इंदापूर', label: 'Indapur' },
      { code: '4165', en: 'Purandar', mr: 'पुरंदर', label: 'Purandar' },
      { code: '4166', en: 'Bhor', mr: 'भोर', label: 'Bhor' },
      { code: '4167', en: 'Velhe', mr: 'वेल्हे', label: 'Velhe' },
      { code: '4168', en: 'Mulshi', mr: 'मुळशी', label: 'Mulshi' }
    ]
  },
  {
    code: '516',
    en: 'Nashik',
    mr: 'नाशिक',
    label: 'Nashik',
    tehsils: [
      { code: '4140', en: 'Nashik City', mr: 'नाशिक शहर', label: 'Nashik City' },
      { code: '4141', en: 'Niphad', mr: 'निफाड', label: 'Niphad' },
      { code: '4142', en: 'Malegaon', mr: 'मालेगाव', label: 'Malegaon' },
      { code: '4143', en: 'Sinnar', mr: 'सिन्नर', label: 'Sinnar' },
      { code: '4144', en: 'Dindori', mr: 'दिंडोरी', label: 'Dindori' },
      { code: '4145', en: 'Igatpuri', mr: 'इगतपुरी', label: 'Igatpuri' },
      { code: '4146', en: 'Yeola', mr: 'येवला', label: 'Yeola' },
      { code: '4147', en: 'Chandwad', mr: 'चांदवड', label: 'Chandwad' },
      { code: '4148', en: 'Nandgaon', mr: 'नांदगाव', label: 'Nandgaon' },
      { code: '4149', en: 'Baglan (Satana)', mr: 'बागलाण (सटाणा)', label: 'Baglan' },
      { code: '4150', en: 'Kalwan', mr: 'कलवण', label: 'Kalwan' },
      { code: '4151', en: 'Deola', mr: 'देवळा', label: 'Deola' },
      { code: '4152', en: 'Surgana', mr: 'सुरगाणा', label: 'Surgana' },
      { code: '4153', en: 'Peth', mr: 'पेठ', label: 'Peth' },
      { code: '4154', en: 'Trimbakeshwar', mr: 'त्र्यंबकेश्वर', label: 'Trimbakeshwar' }
    ]
  },
  {
    code: '527',
    en: 'Satara',
    mr: 'सातारा',
    label: 'Satara',
    tehsils: [
      { code: '4190', en: 'Satara Sadar', mr: 'सातारा सदर', label: 'Satara Sadar' },
      { code: '4191', en: 'Karad', mr: 'कराड', label: 'Karad' },
      { code: '4192', en: 'Wai', mr: 'वाई', label: 'Wai' },
      { code: '4193', en: 'Phaltan', mr: 'फलटण', label: 'Phaltan' },
      { code: '4194', en: 'Koregaon', mr: 'कोरेगाव', label: 'Koregaon' },
      { code: '4195', en: 'Khatav', mr: 'खटाव', label: 'Khatav' },
      { code: '4196', en: 'Maan (Dahiwadi)', mr: 'माण', label: 'Maan' },
      { code: '4197', en: 'Patan', mr: 'पाटण', label: 'Patan' },
      { code: '4198', en: 'Mahabaleshwar', mr: 'महाबळेश्वर', label: 'Mahabaleshwar' },
      { code: '4199', en: 'Jaoli', mr: 'जावळी', label: 'Jaoli' },
      { code: '4200', en: 'Khandala', mr: 'खंडाळा', label: 'Khandala' }
    ]
  },
  {
    code: '528',
    en: 'Solapur',
    mr: 'सोलापूर',
    label: 'Solapur',
    tehsils: [
      { code: '4201', en: 'Solapur North', mr: 'उत्तर सोलापूर', label: 'Solapur North' },
      { code: '4202', en: 'Solapur South', mr: 'दक्षिण सोलापूर', label: 'Solapur South' },
      { code: '4203', en: 'Pandharpur', mr: 'पंढरपूर', label: 'Pandharpur' },
      { code: '4204', en: 'Barshi', mr: 'बार्शी', label: 'Barshi' },
      { code: '4205', en: 'Akkalkot', mr: 'अक्कलकोट', label: 'Akkalkot' },
      { code: '4206', en: 'Mohol', mr: 'मोहोळ', label: 'Mohol' },
      { code: '4207', en: 'Madha', mr: 'माढा', label: 'Madha' },
      { code: '4208', en: 'Sangole', mr: 'सांगोला', label: 'Sangole' },
      { code: '4209', en: 'Malshiras', mr: 'माळशिरस', label: 'Malshiras' },
      { code: '4210', en: 'Karmala', mr: 'करमाळा', label: 'Karmala' },
      { code: '4211', en: 'Mangalwedha', mr: 'मंगळवेढा', label: 'Mangalwedha' }
    ]
  },
  {
    code: '505',
    en: 'Nagpur',
    mr: 'नागपूर',
    label: 'Nagpur',
    tehsils: [
      { code: '4080', en: 'Nagpur Urban', mr: 'नागपूर शहर', label: 'Nagpur Urban' },
      { code: '4081', en: 'Nagpur Rural', mr: 'नागपूर ग्रामीण', label: 'Nagpur Rural' },
      { code: '4082', en: 'Kamptee', mr: 'कामठी', label: 'Kamptee' },
      { code: '4083', en: 'Hingna', mr: 'हिंगणा', label: 'Hingna' },
      { code: '4084', en: 'Katol', mr: 'काटोल', label: 'Katol' },
      { code: '4085', en: 'Narkhed', mr: 'नरखेड', label: 'Narkhed' },
      { code: '4086', en: 'Savner', mr: 'सावनेर', label: 'Savner' },
      { code: '4087', en: 'Kalameshwar', mr: 'कलमेश्वर', label: 'Kalameshwar' },
      { code: '4088', en: 'Ramtek', mr: 'रामटेक', label: 'Ramtek' },
      { code: '4089', en: 'Parseoni', mr: 'पारशिवनी', label: 'Parseoni' },
      { code: '4090', en: 'Mouda', mr: 'मौदा', label: 'Mouda' },
      { code: '4091', en: 'Umred', mr: 'उमरेड', label: 'Umred' },
      { code: '4092', en: 'Kuhi', mr: 'कुही', label: 'Kuhi' },
      { code: '4093', en: 'Bhiwapur', mr: 'भिवापूर', label: 'Bhiwapur' }
    ]
  },
  {
    code: '515',
    en: 'Chhatrapati Sambhajinagar',
    mr: 'छत्रपती संभाजीनगर',
    label: 'Chhatrapati Sambhajinagar',
    tehsils: [
      { code: '4130', en: 'Chhatrapati Sambhajinagar', mr: 'छत्रपती संभाजीनगर', label: 'Chhatrapati Sambhajinagar' },
      { code: '4131', en: 'Paithan', mr: 'पैठण', label: 'Paithan' },
      { code: '4132', en: 'Gangapur', mr: 'गंगापूर', label: 'Gangapur' },
      { code: '4133', en: 'Vaijapur', mr: 'वैजापूर', label: 'Vaijapur' },
      { code: '4134', en: 'Kannad', mr: 'कन्नड', label: 'Kannad' },
      { code: '4135', en: 'Sillod', mr: 'सिल्लोड', label: 'Sillod' },
      { code: '4136', en: 'Soegaon', mr: 'सोयगाव', label: 'Soegaon' },
      { code: '4137', en: 'Phulambri', mr: 'फुलंब्री', label: 'Phulambri' },
      { code: '4138', en: 'Khuldabad', mr: 'खुल्ताबाद', label: 'Khuldabad' }
    ]
  },
  {
    code: '495',
    en: 'Ahilyanagar (Ahmednagar)',
    mr: 'अहिल्यानगर (अहमदनगर)',
    label: 'Ahilyanagar (Ahmednagar)',
    tehsils: [
      { code: '4160', en: 'Nagar', mr: 'नगर', label: 'Nagar' },
      { code: '4161', en: 'Sangamner', mr: 'संगमनेर', label: 'Sangamner' },
      { code: '4162', en: 'Shirdi (Rahata)', mr: 'राहाता', label: 'Shirdi (Rahata)' },
      { code: '4163', en: 'Kopargaon', mr: 'कोपरगाव', label: 'Kopargaon' },
      { code: '4164', en: 'Shrirampur', mr: 'श्रीरामपूर', label: 'Shrirampur' },
      { code: '4165', en: 'Nevasa', mr: 'नेवासा', label: 'Nevasa' },
      { code: '4166', en: 'Shevgaon', mr: 'शेवगाव', label: 'Shevgaon' },
      { code: '4167', en: 'Pathardi', mr: 'पाथर्डी', label: 'Pathardi' },
      { code: '4168', en: 'Rahuri', mr: 'राहुरी', label: 'Rahuri' },
      { code: '4169', en: 'Parner', mr: 'पारनेर', label: 'Parner' },
      { code: '4170', en: 'Akole', mr: 'अकोले', label: 'Akole' },
      { code: '4171', en: 'Shrigonda', mr: 'श्रीगोंदा', label: 'Shrigonda' },
      { code: '4172', en: 'Karjat', mr: 'कर्जत', label: 'Karjat' },
      { code: '4173', en: 'Jamkhed', mr: 'जामखेड', label: 'Jamkhed' }
    ]
  },
  {
    code: '522',
    en: 'Kolhapur',
    mr: 'कोल्हापूर',
    label: 'Kolhapur',
    tehsils: [
      { code: '4212', en: 'Karveer', mr: 'करवीर', label: 'Karveer' },
      { code: '4213', en: 'Kagal', mr: 'कागल', label: 'Kagal' },
      { code: '4214', en: 'Hatkanangle', mr: 'हातकणंगले', label: 'Hatkanangle' },
      { code: '4215', en: 'Shirol', mr: 'शिरोळ', label: 'Shirol' },
      { code: '4216', en: 'Radhanagari', mr: 'राधानगरी', label: 'Radhanagari' },
      { code: '4217', en: 'Gargoti (Bhudargad)', mr: 'भुदरगड', label: 'Bhudargad' },
      { code: '4218', en: 'Ajara', mr: 'आजरा', label: 'Ajara' },
      { code: '4219', en: 'Gadhinglaj', mr: 'गडहिंग्लज', label: 'Gadhinglaj' },
      { code: '4220', en: 'Chandgad', mr: 'चंदगड', label: 'Chandgad' },
      { code: '4221', en: 'Shahuwadi', mr: 'शाहूवाडी', label: 'Shahuwadi' },
      { code: '4222', en: 'Panhala', mr: 'पन्हाळा', label: 'Panhala' },
      { code: '4223', en: 'Bavda (Gaganbawda)', mr: 'गगनबावडा', label: 'Gaganbawda' }
    ]
  },
  {
    code: '520',
    en: 'Thane',
    mr: 'ठाणे',
    label: 'Thane',
    tehsils: [
      { code: '4150', en: 'Thane Sadar', mr: 'ठाणे सदर', label: 'Thane Sadar' },
      { code: '4151', en: 'Kalyan', mr: 'कल्याण', label: 'Kalyan' },
      { code: '4152', en: 'Bhiwandi', mr: 'भिवंडी', label: 'Bhiwandi' },
      { code: '4153', en: 'Ulhasnagar', mr: 'उल्हासनगर', label: 'Ulhasnagar' },
      { code: '4154', en: 'Ambarnath', mr: 'अंबरनाथ', label: 'Ambarnath' },
      { code: '4155', en: 'Murbad', mr: 'मुरबाड', label: 'Murbad' },
      { code: '4156', en: 'Shahapur', mr: 'शहापूर', label: 'Shahapur' }
    ]
  },
  {
    code: '659',
    en: 'Palghar',
    mr: 'पालघर',
    label: 'Palghar',
    tehsils: [
      { code: '6001', en: 'Palghar Sadar', mr: 'पालघर सदर', label: 'Palghar Sadar' },
      { code: '6002', en: 'Vasai', mr: 'वसई', label: 'Vasai' },
      { code: '6003', en: 'Dahanu', mr: 'डहाणू', label: 'Dahanu' },
      { code: '6004', en: 'Talasari', mr: 'तलासरी', label: 'Talasari' },
      { code: '6005', en: 'Jawhar', mr: 'जव्हार', label: 'Jawhar' },
      { code: '6006', en: 'Mokhada', mr: 'मोखाडा', label: 'Mokhada' },
      { code: '6007', en: 'Wada', mr: 'वाडा', label: 'Wada' },
      { code: '6008', en: 'Vikramgad', mr: 'विक्रमगड', label: 'Vikramgad' }
    ]
  },
  {
    code: '517',
    en: 'Raigad',
    mr: 'रायगड',
    label: 'Raigad',
    tehsils: [
      { code: '4170', en: 'Alibag', mr: 'अलिबाग', label: 'Alibag' },
      { code: '4171', en: 'Panvel', mr: 'पनवेल', label: 'Panvel' },
      { code: '4172', en: 'Karjat', mr: 'कर्जत', label: 'Karjat' },
      { code: '4173', en: 'Khalapur', mr: 'खालापूर', label: 'Khalapur' },
      { code: '4174', en: 'Pen', mr: 'पेण', label: 'Pen' },
      { code: '4175', en: 'Uran', mr: 'उरण', label: 'Uran' },
      { code: '4176', en: 'Mangaon', mr: 'माणगाव', label: 'Mangaon' },
      { code: '4177', en: 'Roha', mr: 'रोहा', label: 'Roha' },
      { code: '4178', en: 'Mahad', mr: 'महाड', label: 'Mahad' },
      { code: '4179', en: 'Poladpur', mr: 'पोलादपूर', label: 'Poladpur' },
      { code: '4180', en: 'Shrivardhan', mr: 'श्रीवर्धन', label: 'Shrivardhan' },
      { code: '4181', en: 'Mhasla', mr: 'म्हसळा', label: 'Mhasla' },
      { code: '4182', en: 'Murud', mr: 'मुरुड', label: 'Murud' },
      { code: '4183', en: 'Tala', mr: 'तळा', label: 'Tala' },
      { code: '4184', en: 'Sudhagad (Pali)', mr: 'सुधागड (पाली)', label: 'Sudhagad' }
    ]
  },
  {
    code: '518',
    en: 'Ratnagiri',
    mr: 'रत्नागिरी',
    label: 'Ratnagiri',
    tehsils: [
      { code: '4185', en: 'Ratnagiri Sadar', mr: 'रत्नागिरी सदर', label: 'Ratnagiri Sadar' },
      { code: '4186', en: 'Chiplun', mr: 'चिपळूण', label: 'Chiplun' },
      { code: '4187', en: 'Khed', mr: 'खेड', label: 'Khed' },
      { code: '4188', en: 'Guhagar', mr: 'गुहागर', label: 'Guhagar' },
      { code: '4189', en: 'Dapoli', mr: 'दापोली', label: 'Dapoli' },
      { code: '4190', en: 'Mandangad', mr: 'मंडणगड', label: 'Mandangad' },
      { code: '4191', en: 'Sangameshwar', mr: 'संगमेश्वर', label: 'Sangameshwar' },
      { code: '4192', en: 'Lanja', mr: 'लांजा', label: 'Lanja' },
      { code: '4193', en: 'Rajapur', mr: 'राजापूर', label: 'Rajapur' }
    ]
  },
  {
    code: '519',
    en: 'Sindhudurg',
    mr: 'सिंधुदुर्ग',
    label: 'Sindhudurg',
    tehsils: [
      { code: '4194', en: 'Kudal', mr: 'कुडाळ', label: 'Kudal' },
      { code: '4195', en: 'Kankavli', mr: 'कणकवली', label: 'Kankavli' },
      { code: '4196', en: 'Sawantwadi', mr: 'सावंतवाडी', label: 'Sawantwadi' },
      { code: '4197', en: 'Malvan', mr: 'मालवण', label: 'Malvan' },
      { code: '4198', en: 'Vengurla', mr: 'वेगुर्ला', label: 'Vengurla' },
      { code: '4199', en: 'Devgad', mr: 'देवगड', label: 'Devgad' },
      { code: '4200', en: 'Dodamarg', mr: 'दोडामार्ग', label: 'Dodamarg' },
      { code: '4201', en: 'Vaibhavwadi', mr: 'वैभववाडी', label: 'Vaibhavwadi' }
    ]
  },
  {
    code: '526',
    en: 'Sangli',
    mr: 'सांगली',
    label: 'Sangli',
    tehsils: [
      { code: '4224', en: 'Miraj', mr: 'मिरज', label: 'Miraj' },
      { code: '4225', en: 'Tasgaon', mr: 'तासगाव', label: 'Tasgaon' },
      { code: '4226', en: 'Vita (Khanapur)', mr: 'खानापूर (विटा)', label: 'Vita' },
      { code: '4227', en: 'Atpadi', mr: 'आटपाडी', label: 'Atpadi' },
      { code: '4228', en: 'Jath', mr: 'जत', label: 'Jath' },
      { code: '4229', en: 'Kavathe Mahankal', mr: 'कवठे महांकाळ', label: 'Kavathe Mahankal' },
      { code: '4330', en: 'Walwa (Islampur)', mr: 'वाळवा (इस्लापूर)', label: 'Walwa' },
      { code: '4331', en: 'Shirala', mr: 'शिराळा', label: 'Shirala' },
      { code: '4332', en: 'Kadegaon', mr: 'कडेगाव', label: 'Kadegaon' },
      { code: '4333', en: 'Palus', mr: 'पलूस', label: 'Palus' }
    ]
  },
  {
    code: '511',
    en: 'Nanded',
    mr: 'नांदेड',
    label: 'Nanded',
    tehsils: [
      { code: '4100', en: 'Nanded Sadar', mr: 'नांदेड सदर', label: 'Nanded Sadar' },
      { code: '4101', en: 'Mukhed', mr: 'मुखेड', label: 'Mukhed' },
      { code: '4102', en: 'Deglur', mr: 'देगलूर', label: 'Deglur' },
      { code: '4103', en: 'Kandhar', mr: 'कंधार', label: 'Kandhar' },
      { code: '4104', en: 'Loha', mr: 'लोहा', label: 'Loha' },
      { code: '4105', en: 'Hadgaon', mr: 'हदगाव', label: 'Hadgaon' },
      { code: '4106', en: 'Kinwat', mr: 'किनवट', label: 'Kinwat' },
      { code: '4107', en: 'Bhokar', mr: 'भोकर', label: 'Bhokar' },
      { code: '4108', en: 'Mudkhed', mr: 'मुदखेड', label: 'Mudkhed' },
      { code: '4109', en: 'Biloli', mr: 'बिलोली', label: 'Biloli' },
      { code: '4110', en: 'Dharmabad', mr: 'धर्माबाद', label: 'Dharmabad' },
      { code: '4111', en: 'Umri', mr: 'उमरी', label: 'Umri' },
      { code: '4112', en: 'Himayatnagar', mr: 'हिमायतनगर', label: 'Himayatnagar' },
      { code: '4113', en: 'Mahoor', mr: 'माहूर', label: 'Mahoor' },
      { code: '4114', en: 'Naigaon', mr: 'नायगाव', label: 'Naigaon' },
      { code: '4115', en: 'Ardhapur', mr: 'अर्धापूर', label: 'Ardhapur' }
    ]
  },
  {
    code: '512',
    en: 'Latur',
    mr: 'लातूर',
    label: 'Latur',
    tehsils: [
      { code: '4116', en: 'Latur Sadar', mr: 'लातूर सदर', label: 'Latur Sadar' },
      { code: '4117', en: 'Udgir', mr: 'उदगीर', label: 'Udgir' },
      { code: '4118', en: 'Ahmedpur', mr: 'अहमदपूर', label: 'Ahmedpur' },
      { code: '4119', en: 'Nilanga', mr: 'निलंगा', label: 'Nilanga' },
      { code: '4120', en: 'Ausa', mr: 'औसा', label: 'Ausa' },
      { code: '4121', en: 'Chakur', mr: 'चाकूर', label: 'Chakur' },
      { code: '4122', en: 'Renapur', mr: 'रेणापूर', label: 'Renapur' },
      { code: '4123', en: 'Deoni', mr: 'देवणी', label: 'Deoni' },
      { code: '4124', en: 'Shirur Anantpal', mr: 'शिरूर अनंतपाळ', label: 'Shirur Anantpal' },
      { code: '4125', en: 'Jalkot', mr: 'जळकोट', label: 'Jalkot' }
    ]
  },
  {
    code: '513',
    en: 'Dharashiv (Osmanabad)',
    mr: 'धाराशिव (उस्मानाबाद)',
    label: 'Dharashiv (Osmanabad)',
    tehsils: [
      { code: '4126', en: 'Dharashiv Sadar', mr: 'धाराशिव सदर', label: 'Dharashiv Sadar' },
      { code: '4127', en: 'Tuljapur', mr: 'तुळजापूर', label: 'Tuljapur' },
      { code: '4128', en: 'Omerga', mr: 'उमरगा', label: 'Omerga' },
      { code: '4129', en: 'Paranda', mr: 'परंडा', label: 'Paranda' },
      { code: '4130', en: 'Bhum', mr: 'भूम', label: 'Bhum' },
      { code: '4131', en: 'Kalamb', mr: 'कळंब', label: 'Kalamb' },
      { code: '4132', en: 'Washi', mr: 'वाशी', label: 'Washi' },
      { code: '4133', en: 'Lohara', mr: 'लोहारा', label: 'Lohara' }
    ]
  },
  {
    code: '514',
    en: 'Beed',
    mr: 'बीड',
    label: 'Beed',
    tehsils: [
      { code: '4134', en: 'Beed Sadar', mr: 'बीड सदर', label: 'Beed Sadar' },
      { code: '4135', en: 'Ambajogai', mr: 'अंबाजोगाई', label: 'Ambajogai' },
      { code: '4136', en: 'Parli', mr: 'परळी', label: 'Parli' },
      { code: '4137', en: 'Majalgaon', mr: 'माजलगाव', label: 'Majalgaon' },
      { code: '4138', en: 'Georai', mr: 'गेवराई', label: 'Georai' },
      { code: '4139', en: 'Kaij', mr: 'केज', label: 'Kaij' },
      { code: '4140', en: 'Ashti', mr: 'आष्टी', label: 'Ashti' },
      { code: '4141', en: 'Patoda', mr: 'पाटोदा', label: 'Patoda' },
      { code: '4142', en: 'Shirur Kasar', mr: 'शिरूर कासार', label: 'Shirur Kasar' },
      { code: '4143', en: 'Wadwani', mr: 'वडवणी', label: 'Wadwani' },
      { code: '4144', en: 'Dharur', mr: 'धारूर', label: 'Dharur' }
    ]
  },
  {
    code: '497',
    en: 'Dhule',
    mr: 'धुळे',
    label: 'Dhule',
    tehsils: [
      { code: '4186', en: 'Dhule Sadar', mr: 'धुळे सदर', label: 'Dhule Sadar' },
      { code: '4187', en: 'Sakri', mr: 'साक्री', label: 'Sakri' },
      { code: '4188', en: 'Shirpur', mr: 'शिरपूर', label: 'Shirpur' },
      { code: '4189', en: 'Sindkheda', mr: 'शिंदखेडा', label: 'Sindkheda' }
    ]
  },
  {
    code: '498',
    en: 'Nandurbar',
    mr: 'नंदुरबार',
    label: 'Nandurbar',
    tehsils: [
      { code: '4190', en: 'Nandurbar Sadar', mr: 'नंदुरबार सदर', label: 'Nandurbar Sadar' },
      { code: '4191', en: 'Shahada', mr: 'शहादा', label: 'Shahada' },
      { code: '4192', en: 'Navapur', mr: 'नवापूर', label: 'Navapur' },
      { code: '4193', en: 'Talode', mr: 'तळोदा', label: 'Talode' },
      { code: '4194', en: 'Akkalkuwa', mr: 'अक्कलकुवा', label: 'Akkalkuwa' },
      { code: '4195', en: 'Akrani (Dhadgaon)', mr: 'धडगाव', label: 'Dhadgaon' }
    ]
  }
];
