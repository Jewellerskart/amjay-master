export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const ASSETS_ARRAY = ['hero-banner', 'category', 'collection', 'campaign', 'sub-category', 'blogs', 'events', 'holding'] as const;
export const MENU_ARRAY = ['1-section', '2-section', '3-section', '4-section'] as const;

export const DELIVERY_STATUS = ['pending', 'cancel', 'received', 'ready-to-ship', 'shipped', 'delivered'] as const;
export const ALL_STATUS = ['pending', 'cancel', 'received', 'ready-to-ship', 'shipped', 'delivered', 'return-accepted', 'return-received'] as const;

export const CANCEL_STATUS = ['cancel'] as const;
export const REQUEST_STATUS = ['cancel', 'return', 'exchange'] as const;
export const RETURN_STATUS = ['return-accepted', 'return-received'] as const;
export const EXCHANGE_STATUS = ['exchange-accepted', 'exchange-ready-to-ship', 'exchange-shipped', 'exchange-delivered'] as const;

export const TAX_CODE: Record<string, string> = {
  TAX001: '10%',
  TAX002: '11%',
  TAX003: '12%',
  TAX004: '13%',
  TAX005: '18%',
  TAX006: '100',
  TAX007: '200',
  TAX008: '300',
  TAX009: '400',
  TAX010: '500',
};

export const SELLER_LEVELS: Record<number, string> = {
  1: 'NEW SELLER',
  2: 'SILVER SELLER',
  3: 'GOLD SELLER',
  4: 'ELITE SELLER',
  5: 'SUPER ELITE SELLER',
};

export const SELLER_LEVEL_BENEFITS: Record<number, string[]> = {
  1: [
    'Access to our platform to showcase your products.',
    'Basic support and guidance to help you get started.',
    'Opportunity to grow your business with us.',
    'Access to seller resources and training materials.',
    'Ability to list your products and start selling.',
  ],
  2: [
    'Increased visibility for your products on our platform.',
    'Access to promotional tools to boost your sales.',
    'Priority support from our team.',
    'Eligibility for exclusive seller events and webinars.',
  ],
  3: [
    'Higher commission rates for your sales.',
    'Access to advanced analytics and reporting tools.',
    'Dedicated account manager for personalized support.',
    'Eligibility for featured product placements on our platform.',
  ],
  4: [
    'Enhanced marketing support to promote your brand.',
    'Access to exclusive seller training programs.',
    'Priority listing in search results and categories.',
    'Eligibility for participation in special sales events.',
  ],
  5: [
    'Top-tier support with a dedicated account manager.',
    'Access to premium marketing and advertising opportunities.',
    'Eligibility for exclusive partnerships and collaborations.',
    'Recognition as a leading seller on our platform.',
  ],
};
