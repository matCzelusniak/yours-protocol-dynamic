import { TokenMetadata } from "./types";

export function serializeTokenMetadata(metadata: TokenMetadata): any[] {
  return [
    metadata.name,
    metadata.attributes.map(attr => [attr.trait_type, attr.value]),
    [
      metadata.yours.modules,
      metadata.yours.project,
      metadata.yours.collection,
    ],
    metadata.description,
    metadata.image,
    metadata.animation_url
  ];
}