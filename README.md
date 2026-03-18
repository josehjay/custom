# custom

Custom ERPNext app for POS UI extensions.

## Current customization

- POS item selector list view with item images (ERPNext v16).
- POS Profile toggle: `Use Custom List View with Images`.
- Toggle is grouped under a dedicated `Custom POS` section in `POS Profile`.

## Installation

From your bench:

```bash
bench get-app custom /path/to/custom
bench --site <your-site> install-app custom
bench --site <your-site> migrate
bench build --app custom
bench --site <your-site> clear-cache
bench restart
```
