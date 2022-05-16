const fs = require("fs");
const csv = require("fast-csv");
const { format } = require("@fast-csv/format");
const inRange = require("lodash/inRange");

const allBccCodes = [
  { name: "Accounting/Auditing/Bookkeeping Services", code: "A10100" },
  { name: "Advertising Services", code: "A10200" },
  { name: "Architectural", code: "A10300" },
  {
    name: "Computer Maintenance and Repair Services, Not Elsewhere Classified",
    code: "A10400",
  },
  { name: "Computer Programming", code: "A10500" },
  { name: "Consulting Services", code: "A10600" },
  { name: "Courier Services", code: "A10700" },
  { name: "Exterminating and Disinfecting Services", code: "A10800" },
  { name: "Fax Service", code: "A10900" },
  { name: "Industrial Supplies", code: "A11000" },
  { name: "Insurance", code: "A11100" },
  { name: "Laundry, Cleaning, Garment Services", code: "A11200" },
  { name: "Legal Services and Attorneys", code: "A11300" },
  { name: "Money Orders - Wire Transfer", code: "A11400" },
  { name: "Moving and Storage Companies", code: "A11500" },
  { name: "Photography", code: "A11600" },
  {
    name: "Protective and Security Services - Including Armored Cars, Detective/Protective Agent, and Guard Dogs",
    code: "A11700",
  },
  { name: "Publishing and Printing", code: "A11800" },
  { name: "Real Estate Agents and Managers - Rentals", code: "A11900" },
  { name: "Securities Brokers/Dealers", code: "A12000" },
  {
    name: "Stationary, Office Supplies, Printing, and Writing Paper",
    code: "A12100",
  },
  { name: "Tax Service", code: "A12200" },
  {
    name: "Charitable and Social Service Organizations - Fundraising",
    code: "B20100",
  },
  { name: "Civic, Fraternal, and Social Associations", code: "B20200" },
  { name: "Membership Organizations", code: "B20300" },
  { name: "Political Organizations", code: "B20400" },
  { name: "Religious Organizations", code: "B20500" },
  { name: "Ambulance Services", code: "C30100" },
  { name: "Business and Secretarial Schools", code: "C30200" },
  { name: "Colleges, Universities", code: "C30300" },
  { name: "Correspondence Schools", code: "C30400" },
  {
    name: "Court Costs, Including Alimony and Child Support - Courts of Law",
    code: "C30500",
  },
  { name: "Dance Studios", code: "C30600" },
  { name: "Educational Services", code: "C30700" },
  { name: "Elementary/Secondary Schools", code: "C30800" },
  { name: "Employment Agencies, Temporary Help Services", code: "C30900" },
  { name: "Government Miscellaneous Services", code: "C31000" },
  { name: "Tax Payments", code: "C31100" },
  { name: "U.S. Federal Government Agencies or Department", code: "C31200" },
  { name: "Utilities (Electric, Gas, Water, and Sanitation)", code: "C31300" },
  { name: "Vocational Schools", code: "C31400" },
  { name: "Chiropractor", code: "D40100" },
  { name: "Counseling Service", code: "D40200" },
  { name: "Dentist/Orthodontist", code: "D40300" },
  { name: "Doctors and Physicians", code: "D40400" },
  { name: "Drug Stores and Pharmacies", code: "D40500" },
  { name: "Gym/Health Club", code: "D40600" },
  { name: "Health and Beauty Shops", code: "D40700" },
  { name: "Hearing Aids", code: "D40800" },
  { name: "Hospitals", code: "D40900" },
  { name: "Massage Therapist", code: "D41000" },
  { name: "Medical and Dental Laboratories", code: "D41100" },
  { name: "Medical Practitioner", code: "D41200" },
  { name: "Medical Services", code: "D41300" },
  { name: "Miscellaneous Personal Services", code: "D41400" },
  { name: "Nursing and Personal Care Facilities", code: "D41500" },
  { name: "Optometrists and Ophthalmologists", code: "D41600" },
  { name: "Orthopedic Goods", code: "D41700" },
  { name: "Osteopaths", code: "D41800" },
  { name: "Podiatrists/Chiropodists", code: "D41900" },
  { name: "Psychiatrists", code: "D42000" },
  { name: "Testing Laboratories (Non-Medical)", code: "D42100" },
  { name: "Therapist", code: "D42200" },
  { name: "Veterinary Services", code: "D42300" },
  { name: "Bakeries", code: "E50100" },
  { name: "Bar/Club/Lounge", code: "E50200" },
  { name: "Caterer", code: "E50300" },
  { name: "Confectionery Stores", code: "E50400" },
  { name: "Convenience Stores and Specialty Markets", code: "E50500" },
  { name: "Dairy Product Stores", code: "E50600" },
  { name: "Restaurants", code: "E50700" },
  {
    name: "Antique Shops - Sales, Repairs, and Restoration Services",
    code: "F60100",
  },
  { name: "Apparel and Accessory Shops", code: "F60200" },
  { name: "Art Dealers and Galleries", code: "F60300" },
  { name: `Artist's Supply and Craft Shops`, code: "F60400" },
  { name: "Automotive Body Repair Shops", code: "F60500" },
  { name: "Buying/Shopping Services, Clubs", code: "F60600" },
  { name: `Children and Infant's Wear Stores`, code: "F60700" },
  { name: "Cigar Stores and Stands", code: "F60800" },
  { name: "Commercial Footwear", code: "F60900" },
  { name: "Computer Software Stores", code: "F61000" },
  { name: "Cosmetic Stores", code: "F61100" },
  { name: "Department Stores", code: "F61200" },
  { name: "Drapery, Window Covering, and Upholstery Stores", code: "F61300" },
  { name: "Dry Cleaners", code: "F61400" },
  { name: "Electrical and Small Appliance Repair Shops", code: "F61500" },
  { name: "Electronic Stores", code: "F61600" },
  { name: "Family Clothing Stores", code: "F61700" },
  { name: "Florists", code: "F61800" },
  { name: "Florist Supplies, Nursery Stock, and Flowers", code: "F61900" },
  { name: "Fuel Oil, Wood, Coal, Liquefied Petroleum", code: "F62000" },
  { name: "Funeral Service and Crematories", code: "F62100" },
  { name: "Hobby, Toy, and Game Shops", code: "F62200" },
  { name: "Industrial Supplies", code: "F62300" },
  { name: "Miscellaneous General Merchandise", code: "F62400" },
  { name: "Music Stores", code: "F62500" },
  { name: "Office and School Supply Stores", code: "F62600" },
  {
    name: "Office, Photographic, Photocopy, and Microfilm Equipment",
    code: "F62700",
  },
  { name: "Paint and Wallpaper Stores", code: "F62800" },
  { name: "Pawn Shops and Salvage Yards", code: "F62900" },
  { name: "Pet Shops", code: "F63000" },
  { name: "Precious Stones and Metals", code: "F63100" },
  { name: "Religious Goods Stores", code: "F63200" },
  { name: "Sewing, Needle, Fabric, and Price Goods Stores", code: "F63300" },
  { name: "Shoe Stores", code: "F63400" },
  { name: "Sporting Goods Stores", code: "F63500" },
  { name: "Sports Apparel, Riding Apparel Stores", code: "F63600" },
  { name: "Stamp and Coin Stores", code: "F63700" },
  {
    name: "Stationary, Office Supplies, Printing, and Writing Paper",
    code: "F63800",
  },
  { name: "Tailors, Seamstress, Mending, Alterations", code: "F63900" },
  {
    name: "Telecommunications Equipment including Telephone Sales",
    code: "F64000",
  },
  { name: "Variety Stores", code: "F64100" },
  { name: `Women's Clothing Stores`, code: "F64200" },
  { name: "Air Conditioning and Refrigeration Repair Shops", code: "G70100" },
  { name: "Alarm Monitoring", code: "G70200" },
  { name: "Automobile and Truck Dealers (Used Only)", code: "G70300" },
  { name: "Automobile Parking Lots and Garages", code: "G70400" },
  { name: "Automobile Parts and Accessories Stores", code: "G70500" },
  { name: "Automotive Service Shops", code: "G70600" },
  { name: "Automotive Tire Stores", code: "G70700" },
  { name: "Bail and Bond Payments", code: "G70800" },
  { name: "Barber and Beauty Shops", code: "G70900" },
  { name: "Cable and Other Pay Television", code: "G71000" },
  { name: "Car and Truck Dealers", code: "G71100" },
  { name: "Carpentry Contractors", code: "G71200" },
  { name: "Carpet Cleaning", code: "G71300" },
  { name: "Childcare", code: "G71400" },
  { name: "Cleaning and Maintenance, Janitorial Services", code: "G71500" },
  { name: "Construction Materials", code: "G71600" },
  { name: "Electrical Contractors", code: "G71700" },
  { name: "Electrical Parts and Equipment", code: "G71800" },
  { name: "Equipment Rental and Leasing Services", code: "G71900" },
  { name: "Floor Covering Stores", code: "G72000" },
  { name: "Furniture Store", code: "G72100" },
  { name: "General Contractors - Residential and Commercial", code: "G72200" },
  { name: "Hardware Equipment and Supplies", code: "G72300" },
  { name: "Hardware Stores", code: "G72400" },
  { name: "Heating and Air Conditioning", code: "G72500" },
  { name: "Home Furnishing Specialty Stores", code: "G72600" },
  { name: "Home Supply Warehouse Stores", code: "G72700" },
  { name: "Household Appliance Stores", code: "G72800" },
  { name: "Jewelry Repair", code: "G72900" },
  { name: "Landscaping/Horticultural Services", code: "G73000" },
  { name: "Lumber and Building Materials Stores", code: "G73100" },
  { name: "Metal Service Centers and Offices", code: "G73200" },
  { name: "Mobile Home Dealers", code: "G73300" },
  { name: "Motor Vehicle Supplies and New Parts", code: "G73400" },
  { name: "Motorcycle Dealers", code: "G73500" },
  { name: "Nurseries - Lawn and Garden Supply Store", code: "G73600" },
  { name: "Office and Commercial Furniture", code: "G73700" },
  { name: "Pest Control", code: "G73800" },
  { name: "Petroleum and Petroleum Products", code: "G73900" },
  { name: "Plumbing and Heating Equipment and Supplies", code: "G74000" },
  { name: "Repair Shops", code: "G74100" },
  { name: "Roofing", code: "G74200" },
  { name: "Swimming Pools - Sales, Service, and Supplies", code: "G74300" },
  { name: "Airports, Airport Terminals", code: "H80100" },
  { name: "Bands and Orchestras", code: "H80200" },
  { name: "Bicycle Shops - Sales and Service", code: "H80300" },
  { name: "Boat Rentals and Leases", code: "H80400" },
  { name: "Country Clubs", code: "H80500" },
  { name: "Cruise Lines", code: "H80600" },
  { name: "Dating and Escort Services", code: "H80700" },
  { name: "Golf Courses", code: "H80800" },
  {
    name: "Lodging - Hotels, Motels, Resorts, Central Reservation Services",
    code: "H80900",
  },
  { name: "Marinas, Marine Service, and Supplies", code: "H81000" },
  { name: "Motion Picture Theaters", code: "H81100" },
  { name: "Motor Home and Recreational Vehicle Rentals", code: "H81200" },
  { name: "Recreation Services", code: "H81300" },
  { name: "Sports Recreation", code: "H81400" },
  { name: "Theatrical Producers/Ticket Agencies", code: "H81500" },
  { name: "Timeshares", code: "H81600" },
  { name: "Tourism", code: "H81700" },
  { name: "Trailer Parks and Camp Grounds", code: "H81800" },
  { name: "Travel Agencies and Tour Operations", code: "H81900" },
  { name: "Video Amusement and Game Supplies", code: "H82000" },
  { name: "Airlines, Air Carriers", code: "I90100" },
  { name: "Airport Shuttle Transportation", code: "I90200" },
  { name: "Automated Fuel Dispensers", code: "I90300" },
  { name: "Boat Dealers", code: "I90400" },
  { name: "Bus Lines, Including Charters and Tour Busses", code: "I90500" },
  { name: "Car Rental Companies (Not Listed Below)", code: "I90600" },
  { name: "Car Wash Services", code: "I90700" },
  {
    name: "Local/Suburban Commuter Passenger Transportation - Railroad, Ferries, Local Water Transportation",
    code: "I90800",
  },
  { name: "Passenger Railways", code: "I90900" },
  { name: "Taxicabs and Limousines", code: "I91000" },
  { name: "Toll and Bridge Fees", code: "I91100" },
  { name: "Towing Services", code: "I91200" },
  { name: "Truck and Utility Trailer Rentals", code: "I91300" },
];

const findMatchViaKeyword = (bccCodes, keyword) => {
  return bccCodes.find((bcc) => {
    return keyword
      .toLowerCase()
      .replace("services", "")
      .replace("service", "")
      .replace("and", "")
      .replace("or", "")
      .replace("&", "")
      .replace("shops", "")
      .replace("shop", "")
      .replace("stores", "")
      .replace("store", "")
      .replace("dealers", "")
      .replace("dealer", "")
      .replace(/\-/g, "")
      .split(" ")
      .some((n) =>
        bcc.name
          .toLowerCase()
          .split(" ")
          .some((b) => b === n)
      );
  });
};

const writeCsv = async () => {
  const mccFile = "csv/mcc.csv";

  const mccCodes = [];

  await new Promise((resolve) => {
    fs.createReadStream(mccFile)
      .pipe(csv.parse({ headers: true }))
      .on("error", (error) => console.error(error))
      .on("data", (row) => {
        mccCodes.push(row);
      })
      .on("end", resolve);
  });

  const csvStream = format({ headers: true });
  const writeStream = fs.createWriteStream("csv/output.csv");
  csvStream.pipe(writeStream);

  const results = mccCodes.map((mccCode) => {
    const name = mccCode["Display Name"];
    const code = +mccCode["Name"];

    const r = {
      mcc: mccCode["Name"],
      mccn: name,
      bcc: null,
      bccn: null,
    };

    if (!name.toUpperCase().includes("N/A")) {
      if (inRange(code, 2999, 3299)) {
        r.bcc = "I90600";
      } else if (inRange(code, 3299, 3441)) {
        r.bcc = "I90600";
      } else if (inRange(code, 3441, 3900)) {
        r.bcc = "H80900";
      } else if (inRange(code, 5610, 5699)) {
        r.bcc = "F60200";
      }

      if (!r.bcc) {
        let preferredBccPrefix;
        const s = +r.mcc.slice(0, 2);

        if (inRange(s, 15, 29)) {
          preferredBccPrefix = "G";
        } else if (inRange(s, 50, 56)) {
          preferredBccPrefix = "F";
        } else if (inRange(s, 90, 99)) {
          preferredBccPrefix = "C";
        } else if (inRange(s, 35, 39)) {
          preferredBccPrefix = "H";
        }

        if (preferredBccPrefix && name) {
          const match = findMatchViaKeyword(
            allBccCodes.filter(
              (b) => b.code.slice(0, 1) === preferredBccPrefix
            ),
            name
          );

          if (match) {
            r.bcc = match.code;
          }
        }
      }
    }

    if (r.bcc) {
      const match = allBccCodes.find((b) => b.code === r.bcc);
      if (match) {
        r.bccn = match.name;
      }
    } else if (!name.toUpperCase().includes("N/A")) {
      const match = findMatchViaKeyword(allBccCodes);

      if (match) {
        r.bcc = match.code;
        r.bccn = match.name;
      }
    }

    return {
      mcc: mccCode["Name"],
      mccn: name,
      bcc: r.bcc || null,
      bccn: r.bccn || null,
    };
  });

  console.log(JSON.stringify(results));
};

module.exports = { writeCsv };
