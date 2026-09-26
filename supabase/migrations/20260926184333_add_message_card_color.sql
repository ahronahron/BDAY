/*
# Add contributor card colors

## Overview
Adds a saved color choice to each birthday contribution so TJ's wall can
preserve the contributor's chosen card style.

## Modified Tables

### `messages`
- `card_color` (text, not null, default `#E8F0EC`) — validated client-selected
  background color used for the contributor's card on TJ's wall.

## Security
- Existing single-tenant anon/authenticated CRUD policies remain unchanged.
- No data is removed or renamed.

## Important Notes
1. Existing messages receive the default mint color.
2. New and updated messages may save one of the app's offered color values.
*/

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS card_color text NOT NULL DEFAULT '#E8F0EC';
