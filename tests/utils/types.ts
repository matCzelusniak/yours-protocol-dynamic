export type Attribute = {
  trait_type: string;
  value: string;
};

export type YoursMetadata = {
  modules: string[];
  project: string;
  collection: string;
};

export type TokenMetadata = {
  name: string;
  attributes: Attribute[];
  yours: YoursMetadata;
  description: string;
  image: string;
  animation_url: string;
};