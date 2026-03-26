export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const BACKEND_API_URL = IS_PRODUCTION ? 'https://share.jewellerskart.com/amjay-api-server' : 'http://localhost:4000';
export const FRONTEND_URL = IS_PRODUCTION ? 'https://amjay-master.vercel.app' : 'http://localhost:5173';

export const AWS_BASE_URL = 'https://jk-marketplace.s3.ap-south-1.amazonaws.com';
export const AWS_ASSETS_URL = `${AWS_BASE_URL}/assets`;

const normalizeBrandName = (brandName: string): string => brandName.toLowerCase().replace(/\s+/g, '_');

export const getAwsProductUrl = (sellerId: string, skuId: string): string => `${AWS_BASE_URL}/${sellerId}/product/${skuId}/${skuId}`;
export const getAwsProductBrandUrl = (brandName: string, skuId: string): string => `${AWS_BASE_URL}/%23${normalizeBrandName(brandName)}/product/${skuId}/${skuId}`;
export const getAwsBrandUrl = (brandName: string): string => `${AWS_BASE_URL}/%23${normalizeBrandName(brandName)}`;

const isMobileDevice = (): boolean => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const WHATSAPP_LINK = isMobileDevice() ? 'whatsapp://send?phone=9920300088' : 'https://wa.me/9920300088';
export const MAIL_LINK = 'mailto:support@jewellerskart.com';
export const PHONE_NUMBER = '98190 82345';
export const PHONE_LINK = `tel:+91${PHONE_NUMBER.replace(/\s+/g, '')}`;
