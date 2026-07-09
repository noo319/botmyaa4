# Admin Commands

Owner ID: `8573174269`

## Balance

```text
/addbalance USER_ID AMOUNT
/removebalance USER_ID AMOUNT
/setbalance USER_ID AMOUNT
/check USER_ID
```

## Orders / Messages

```text
/orders
/broadcast MESSAGE
/reply USER_ID MESSAGE
```

## Coupons

```text
/addcoupon CODE PERCENT
/delcoupon CODE
/coupons
```

## Users

```text
/ban USER_ID
/unban USER_ID
/setmin USER_ID AMOUNT
/resetmin USER_ID
```

## Admins

Only the owner can use these:

```text
/addadmin USER_ID
/deladmin USER_ID
/admins
```

## Products and Prices

```text
/prices
/setprice CAT_KEY PRODUCT_ID PRICE
/addproduct id|category|title|base_price|rate|ask_game_id(0/1)
/delproduct PRODUCT_ID
```

## Rates and Discounts

```text
/discount24
/discountall PERCENT
/setrate CATEGORY PERCENT
/setgamerate PERCENT
/setcoderate PERCENT
```

## Data

```text
/payments
/backup
/restore
/exportusers
/exportorders
/exportbalances
```

Note: `/restore` is intentionally disabled for safety. Restore manually by replacing JSON files in `data/`.
