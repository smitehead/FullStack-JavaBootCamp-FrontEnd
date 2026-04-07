import LOCATION_RAW from '@/data/location_data.json';

export { CATEGORY_DATA } from '@/data/category_data';
export const LOCATION_DATA = LOCATION_RAW as {
  name: string;
  short: string;
  sub: {
    name: string;
    sub: string[];
  }[];
}[];