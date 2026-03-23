import { TBasicDataStructure } from '..';

export type IProductData = {
  id: number;
  name: string;
  specialPrice: string;
  oldPrice: string;
  image: {
    webp: string;
    png: string;
    alt: string;
  };
  discount?: string;
};
export type IProduct = TBasicDataStructure & {
  brand_name: string;
  batch_name?: string;
  seller_sku_id: string;
  is_mrp: boolean;
  variant?: string;
  listing_status: boolean;
  mrp_inr: number;
  selling_price: number;
  procurement_type: string;
  procurement_sla_days: number;
  stock: number;
  delivery_charges?: number;
  make_to_order?: boolean;
  base_length?: string;
  length?: string;
  weight?: string;
  height?: string;
  tax_code?: string;
  size?: string;
  tag?: string;
  base_material?: string;
  model_name?: string;
  category?: string;
  sub_category?: string;
  ideal_for?: string[];
  occasion?: string[];
  purity?: string;
  certification?: string[];
  diamond_clarity?: string;
  diamond_color_grade?: string;
  diamond_cut?: string;
  number_of_diamonds?: number;
  weight_of_diamonds?: number;
  search_keywords?: string[];
  search_title?: string;
  search_description?: string;
  description?: string;
  video_url?: string;
  warranty?: string;
  warranty_summary?: string;
  returnable?: number;
  returnable_summary?: string;
  verified?: boolean;
  status?: string;
};
export const apiProductsData: IProductData[] = [
  {
    id: 1,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img01.webp',
      png: 'assets/images/products/product-img01.png',
      alt: 'product-img01',
    },
    discount: '20% OFF',
  },
  {
    id: 2,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img02.webp',
      png: 'assets/images/products/product-img02.png',
      alt: 'product-img02',
    },
  },
  {
    id: 3,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img03.webp',
      png: 'assets/images/products/product-img03.png',
      alt: 'product-img03',
    },
  },
  {
    id: 4,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img04.webp',
      png: 'assets/images/products/product-img04.png',
      alt: 'product-img04',
    },
  },
  {
    id: 5,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img01.webp',
      png: 'assets/images/products/product-img01.png',
      alt: 'product-img01',
    },
    discount: '20% OFF',
  },
  {
    id: 6,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img02.webp',
      png: 'assets/images/products/product-img02.png',
      alt: 'product-img02',
    },
  },
  {
    id: 7,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img03.webp',
      png: 'assets/images/products/product-img03.png',
      alt: 'product-img03',
    },
  },
  {
    id: 8,
    name: 'Auspicious Turtle Ring',
    specialPrice: '70789.95',
    oldPrice: '80789.95',
    image: {
      webp: 'assets/images/products/product-img04.webp',
      png: 'assets/images/products/product-img04.png',
      alt: 'product-img04',
    },
  },
];
export type ITax = {
  email?: string;
  tax_code_1?: string;
  tax_code_1_type?: string;
  tax_code_1_value?: number;
  tax_code_2?: string;
  tax_code_2_type?: string;
  tax_code_2_value?: number;
  tax_code_3?: string;
  tax_code_3_type?: string;
  tax_code_3_value?: number;
};
export type IProductApproval = TBasicDataStructure & {
  batch_name: string;
  seller: string;
  status: string;
  seller_sku_id: string;
  approver: string;
  reason: string;
};
