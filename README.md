# Yours

`Yours` is a token standard built on top of Chromia's relational blockchain to enable tokens to have on-chain utility through dynamic metadata. Utilizing Chromia's FT4 standard, `Yours` ensures full interoperability with existing token bridges, allowing all types of assets to be stored under a single account.

With `Yours`, we believe that metadata should be dynamic and evolve over time, marking the end of static off-chain metadata.

`Yours` intentionally does not impose a rigid structure on the database persistence layer. Instead, it enforces a schema that must be used when transferring tokens and their metadata between different blockchains. This flexibility allows dapps to store data in a way that best suits their specific utility needs. The primary benefits of this approach are enhanced performance and ease of use, as tokens can be designed like any other relationally persisted data.

## Getting Started

### Installing the Library

`Yours` has two dependencies in order to be interoperable with the Chromia ecosystem.
- FT4
- ICCF

The following libs will be needed to be added to your `chromia.yml` file in order to be able to use `Yours`.

```yaml
libs:
  ft4:
    registry: https://gitlab.com/chromaway/ft4-lib.git
    path: rell/src/lib/ft4
    tagOrBranch: v1.0.0r
    rid: x"FA487D75E63B6B58381F8D71E0700E69BEDEAD3A57D1E6C1A9ABB149FAC9E65F"
    insecure: false
  iccf:
    registry: https://gitlab.com/chromaway/core/directory-chain
    path: src/iccf
    tagOrBranch: 1.32.2
    rid: x"1D567580C717B91D2F188A4D786DB1D41501086B155A68303661D25364314A4D"
    insecure: false
  yours:
    registry: ---
    path: src/lib/yours
    tagOrBranch: ---
    rid: x"---"
    insecure: false
```

After that, run `chr install` to pull in the dependencies.

### Creating Your(s) First Module

A [module](https://docs.chromia.com/category/module-definitions) is a concept defined by Chromia's programming language Rell.

We use the terminology as well in `Yours` as a utility provider to a token. Let's assume that you have a token that represents a sweater. Now you want to allow this token to be equipped by an account. In that case, you could build an `equippables` module that integrates with `Yours`.

```kotlin
// equippables/module.rell
module;

import lib.yours;
```

Next, we will define the persistence layer for the utility that you want to provide. Here you have complete freedom as a developer to decide what metadata you want to associate with the token, but also how you persist that.

It is recommended to create an entity that references the underlying token tagged with the key attribute to ensure that it can only be created once for each token in your dapp. But this is also optional if you choose to go another direction.

```kotlin
// equippables/model.rell
entity equippable {
  key mega_yours.token;
}

entity occupying_slot {
  key equippable, name;
}
```

That's it. That's all you need to do to integrate with `Yours`. Now you can write logic in your dapp that utilizes these entities to provide use and provide dynamic metadata to the token.

### Preparing Tokens to be Transferred to Another Dapp

Since you are integrating a token standard, it's pretty safe to assume that you want to integrate with other dapps and blockchains as well. Let's have a look at how that works.

In our module above, we declared utility in that an equippable has `1..*` occupying slots. For example, a sweater might occupy the "torso" slot, and a cap might occupy the "hat" slot.

When we transfer this token from our dapp into another dapp, we want this metadata to follow along and be attached to the token in the receiving chains as well. This is done by extending and implementing the `populate_metadata` function. Therefore, we create an `extensions.rell` file.

```kotlin
@extend(yours.populate_metadata)
function populate_metadata(yours.token, modules: set<name>): map<text, gtv>() {
  if (not modules.contains("equippables")) return null;
  val metadata = map<text, gtv>();

  val equippable = equippable @? { token };
  if (equippable == null) return null;

  val slots = occupying_slot @* { .equippable.token == token } ( .name );
  if (not slots.empty()) {
    metadata.put("slots", slots.to_gtv());
  }

  return metadata;
}
```

Two parameters are passed into this function: the underlying token and the modules that this token has declared it supports.

You are expected to return `null` if the token does not support your module; otherwise, you waste some compute time by looking for utility that does not exist for this specific token.

This function is expected to return a `map<text, gtv>`. Everything that you put into this map will be included in the token's metadata under the attributes property. This is consistent and interoperable with the ERC721 Metadata Standard.

This same function also serves another purpose in populating your metadata for tokens into the query `yours.metadata(token_id)`.

### Receiving Tokens from Another Dapp

When you receive a token from another dapp, it is optional if you want to utilize the metadata that was attached to the token. No matter if you choose to use the metadata or not, the data is still persisted by `Yours` so that it is not lost when sending the token to another blockchain.

However, if you want to utilize the metadata that was attached to the token, you can do so by implementing the `after_apply_transfer` function in your receiving dapp.

```kotlin
@extend(yours.after_apply_transfer)
function after_apply_transfer(yours.token, modules: set<name>,attributes: map<text, gtv>) {
  if (not modules.contains("equippables")) return;

  val equippable = equippable @? { token } ?: create equippable(token);
  val slots = list<name>.from_gtv(attributes.get("slots"));
  for (slot in slots) {
    val occupying_slot = occupying_slot @? { equippable, slot } ?: create occupying_slot(equippable, slot);
  }
}
```

Three parameters are passed into this function: the underlying `token`, the `modules` that this `token` has declared it supports, and the `attributes` that were attached to the `token`.

Here it is up to you to decide which attributes you want to map to entities in your own dapp in order to utilize.

### Adding Creation & Minting Support

Not every dapp will need minting support. It's only if you want to create your own tokens instead of re-using another dapp's `token`.

If you do want to create a new asset, that can be done by defining a new `token`.

```kotlin
operation register_equippable(name, symbol: name, slots: list<name>, image: text, animation_url: text) {
  val spec = yours.token_specification(
    name,
    symbol,
    decimals = 0,
    icon_url = image,
    modules = [rell.meta(register_equippable).module_name]
  );

  val token = yours.define_token(spec);
  yours.attach_animation(token, animation_url);

  val equippable = create equippable(token);
  for (slot in slots) {
    create occupying_slot(equippable, slot);
  }
}
```

There are a couple of optional things you can do here in terms of generic metadata. In the example above, we attach an `animation_url`. You can also attach a `description` of your token if you want to.

Below that, we create a new `equippable` entity and `occupying_slot` entities for each slot that was passed in, which is specific for your dapp and how you choose to represent the token.

After that, you can mint this token by calling:

```kotlin
operation mint_token(token_id: byte_array, amount: integer, account_id: byte_array) {
  val token = yours.token @ { .asset.id == token_id };
  val account = accounts.account @ { .id == account_id };
  yours.mint_tokens(token, yours.balance_specification(account, amount));
}
```

The `token_id` gets created by `FT4` when you define the token. But you can also specify the `token` by its `name`.


```kotlin
val token = yours.token @ { .asset.name == asset_name };
```