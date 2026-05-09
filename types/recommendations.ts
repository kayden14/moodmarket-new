import { Product } from './database';

export interface ScoredProduct extends Product {
  score: number;
  reason: string;
}
