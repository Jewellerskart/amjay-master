import { LiveRateApiResponse, MetalData, TMetalData } from './api/liveRate';
import * as ISeller from './api/seller';
import * as IUser from './api/user';
import * as IProduct from './api/product';
import * as IOrder from './api/order';
export type TBasicDataStructure = {
  _id?: string;
  __v?: number;
  active?: number;
  createdAt?: string;
  updatedAt?: string;
};
export type TCampaign = TBasicDataStructure & {
  brand_name?: string;
  description?: string;
  title?: string;
  sub_title?: string;
  name?: string;
};
export type TLocality = TBasicDataStructure & {
  id?: string;
  name?: string;
  country_id?: string;
  country_code?: string;
  state_code?: string;
  country?: string;
};
export interface IPopup {
  text: string;
  href: string;
  status: string;
  date: string;
}
export type IAssets = TBasicDataStructure & {
  section?: string;
  url?: string;
  name?: string;
  info?: string;
  image?: string;
  status?: boolean;
  single_file_1?: any;
};
export type TMenu = TBasicDataStructure & {
  section?: string;
  filter_1?: { name: string; url: string }[];
  filter_2?: { name: string; url: string }[];
  filter_3?: { name: string; url: string }[];
  banner_1?: string;
  banner_2?: string;
  view_all_url?: string;
  name?: string;
  status?: boolean;
  single_file_1?: any;
  single_file_2?: any;
};
export type TFooter = TBasicDataStructure & {
  section?: string;
  filter_1?: { name: string; url: string }[];
  name?: string;
  status?: boolean;
};
export type TCms = TBasicDataStructure & {
  data?: any;
  name?: string;
  url?: string;
  status?: boolean;
};
export type IBrandDetails = TBasicDataStructure & {
  brand_name: string;
  sub_title: string;
  description: string;
  img: string;
  theme: number;
  color: string;
  bg: string;
};
export type ICoupon = TBasicDataStructure & {
  brand?: string;
  coupon_code?: string;
  couponId?: string;
  max?: number;
  min?: number;
  discount?: number;
  discountOn?: string;
  expiresAt?: string;
  type?: string;
};
export type TMessages = TBasicDataStructure & {
  code: string;
  subject: string;
  message: string;
  email: string;
  type: string;
  response?: {
    date: string;
    message: string;
    email: string;
  }[];
  status: string;
};
export type TApiResponse = { status_code?: number; data?: any; message?: string; success?: boolean };
export type { ISeller, LiveRateApiResponse, MetalData, TMetalData, IProduct, IUser, IOrder };
