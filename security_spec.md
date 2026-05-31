# Security Specification for SmartDisplay

## 1. Data Invariants
- **Public Displays**: Physical TV screens (e.g., connected Fire TVs) must be able to read their layout definition (`screens/{screenId}`) instantly via simple Web URL fetching without requiring complex administrative authentication.
- **Admin Writing Permissions**: Only authenticated administrative requests can create, update, or delete display configurations and product items.
- **Data Sizes**: Image assets uploaded in screens (under `currentImage` base64 strings) must be structured safely, with ID formatting constraints to prevent resource-denial attacks.

## 2. The "Dirty Dozen" Threat Assessment Payloads
We block these high-risk vectors at the database gateway:
1. Attempting to write a new screen configuration without a valid authentication token.
2. Injected shadow fields on document creation (e.g. adding unauthorized `isAdmin` attributes).
3. Attempting to update screen fields with invalid types (e.g., replacing a string name with a number).
4. Attempting to hijack another user's identity when calling write services.
5. Injecting extremely large, malicious string IDs to exploit document pricing loops.
6. Skipping state steps or inserting invalid aspect ratios.
7. Attempting to write a product item with empty identifiers.
8. Writing a negative price for product index updates.
9. Modifying static history indicators or timestamp fields during item creation.
10. Attempting to bypass restricted update keys with broad structural replacements.
11. Disabling screen statuses or setting unrecognized enumerations.
12. Attempting to batch remove all catalog inventories anonymously.

## 3. Firestore Rules draft and structure
We establish a zero-trust model where:
- `read` operations for screens are authorized publicly for simplicity of Fire TV Silk/Firefox display browser integrations.
- `write` operations require a signed-in admin account.
- Dynamic key variations are validated via strict size and shape helpers matching rules version 2.
