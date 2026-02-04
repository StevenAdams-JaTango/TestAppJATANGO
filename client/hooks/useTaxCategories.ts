export interface TaxCategory {
  name: string;
  product_tax_code: string;
  description: string;
}

// Comprehensive tax categories based on TaxJar's standard categories
// These are the most common product tax codes used in e-commerce
const DEFAULT_TAX_CATEGORIES: TaxCategory[] = [
  {
    name: "General - Tangible Goods",
    product_tax_code: "00000",
    description: "Default tax code for tangible personal property.",
  },
  {
    name: "Clothing",
    product_tax_code: "20010",
    description: "All human wearing apparel suitable for general use.",
  },
  {
    name: "Clothing - Swimwear",
    product_tax_code: "20041",
    description: "Bathing suits and swim suits.",
  },
  {
    name: "Food & Groceries",
    product_tax_code: "40030",
    description: "Food for human consumption, unprepared.",
  },
  {
    name: "Prepared Foods",
    product_tax_code: "41000",
    description:
      "Foods intended for on-site consumption. Ex. Restaurant meals.",
  },
  {
    name: "Candy",
    product_tax_code: "40010",
    description: "Candy and similar items.",
  },
  {
    name: "Soft Drinks",
    product_tax_code: "40050",
    description:
      "Soft drinks, soda, and other similar beverages. Does not include fruit juices and water.",
  },
  {
    name: "Bottled Water",
    product_tax_code: "40060",
    description: "Bottled, drinkable water for human consumption.",
  },
  {
    name: "Supplements",
    product_tax_code: "40020",
    description: "Non-food dietary supplements.",
  },
  {
    name: "Non-Prescription Drugs",
    product_tax_code: "51010",
    description: "Drugs for human use without a prescription.",
  },
  {
    name: "Prescription Drugs",
    product_tax_code: "51020",
    description: "Drugs for human use with a prescription.",
  },
  {
    name: "Digital Goods",
    product_tax_code: "31000",
    description:
      "Digital products transferred electronically, meaning obtained by the purchaser by means other than tangible storage media.",
  },
  {
    name: "Software as a Service",
    product_tax_code: "30070",
    description:
      "Pre-written software, delivered electronically, but accessed remotely.",
  },
  {
    name: "Books",
    product_tax_code: "81100",
    description: "Books, printed.",
  },
  {
    name: "Textbooks",
    product_tax_code: "81110",
    description: "Textbooks, printed.",
  },
  {
    name: "Religious Books",
    product_tax_code: "81120",
    description: "Religious books and manuals, printed.",
  },
  {
    name: "Magazines & Subscriptions",
    product_tax_code: "81300",
    description: "Periodicals, printed, sold by subscription.",
  },
  {
    name: "General Services",
    product_tax_code: "19000",
    description:
      "Miscellaneous services which are not subject to a service-specific tax levy.",
  },
  {
    name: "Professional Services",
    product_tax_code: "19005",
    description:
      "Professional services which are not subject to a service-specific tax levy.",
  },
  {
    name: "Installation Services",
    product_tax_code: "10040",
    description:
      "Installation services separately stated from sales of tangible personal property.",
  },
  {
    name: "Repair Services",
    product_tax_code: "19007",
    description:
      "Services provided to restore tangible personal property to working order or optimal functionality.",
  },
  {
    name: "Training Services",
    product_tax_code: "19004",
    description:
      "Services provided to educate users on the proper use of a product.",
  },
  {
    name: "Advertising Services",
    product_tax_code: "19001",
    description:
      "Services rendered for advertising which do not include the exchange of tangible personal property.",
  },
  {
    name: "Printing Services",
    product_tax_code: "19009",
    description:
      "Services provided to apply graphics and/or text to paper or other substrates.",
  },
  {
    name: "Nontaxable",
    product_tax_code: "99999",
    description: "Item is exempt from sales tax.",
  },
];

// Simple hook that returns the default tax categories
// TaxJar API integration can be added later if needed
export function useTaxCategories() {
  return {
    categories: DEFAULT_TAX_CATEGORIES,
    isLoading: false,
    error: null,
  };
}

// Export default categories for direct use
export { DEFAULT_TAX_CATEGORIES };
