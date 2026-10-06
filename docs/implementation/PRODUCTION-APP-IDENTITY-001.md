# PRODUCTION-APP-IDENTITY-001 — Orient installed-app identity

The Orient wordmark signs the instrument. The Beacon represents the instrument.

`public/orient-logo.png` remains the horizontal Beacon and Orient wordmark inside the instrument. This tranche does not replace, crop, or redraw it.

The installed application, home screen, and application metadata use a different asset: the accepted square Beacon.

## Source

The source file is `/Users/silentsage/Desktop/Orient_App_Icon_Master.png`. It was copied unchanged. The Desktop file was not edited.

It is a PNG, 1254 × 1254, 8-bit RGB, color type 2, non-interlaced, with no alpha channel. It is already square. The file is 2,012,545 bytes. SHA-256: `f5e896a145f33ffb9ff15a539b65652b5e6a790bcf91a6986effac9acda56eab`.

Because it is square, a production icon is a resize of the entire composition. No crop and no recomposition are required for the ordinary icons.

## Repository master

The canonical copy is `public/orient-app-icon-master.png`. It is byte-identical to the Desktop source and carries the same SHA-256. Runtime code loads paths under `/`. It does not read the Desktop path.

## Derived icons

Both derivatives were resized from that master with sharp 0.35.5, Lanczos3, fitting the full square onto the full square. No sharpening, palette reduction, recoloring, border, plate, or text was added. Neither file has an alpha channel.

| File | Pixels | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `public/orient-icon-192.png` | 192 × 192 | 73,917 | `c6eb69797436fc9f2aec1408c90ffe58f61207a8ee2b0c1ad00d3e96c36b191b` |
| `public/orient-icon-512.png` | 512 × 512 | 486,792 | `e58650f219b6b676832b23d8acbf157b51e3075b305a52d7ec06c5546ff49f21` |

## Manifest

`app/manifest.ts` remains the only manifest. The installed name and short name stay Orient. `start_url` stays `/`. Display stays `standalone`. Background and theme stay `#10141c`. Description stays "One field of time."

The manifest adds the two PNGs above, each `image/png`, purpose `any`.

## Maskable

No maskable icon was created.

Android's maskable safe zone is a circle whose diameter is 66/108 of the icon. On this 1254-pixel master that radius is about 383 pixels. The luminous east and west points of the Beacon sit about 160 pixels in from the edge, at a radius of about 468 pixels, outside that circle. The north luminous edge of the baked rounded-square border reaches the top of the canvas. Putting the Beacon inside the safe circle would shrink it to about half its present radius and would require new padding. That is a different composition. It needs human visual review before any maskable asset exists.

The artwork is also already a rounded square with its own border. Labeling it maskable would invite a second crop. Ordinary icons therefore use purpose `any` only.

## Browser metadata

`app/layout.tsx` points the document icon and the Apple touch icon at these same PNGs. There is no second metadata system and no generated icon route. No `favicon.ico` and no separate 180-pixel Apple file were invented. A browser tab uses the 192 PNG. Apple may scale that same file. A dedicated favicon format, if one is wanted later, is a separate asset decision.

The in-instrument mark is unchanged: `OrientIdentity` still loads `/orient-logo.png`.

## Acceptance

Physical acceptance of the installed icon on the Samsung Galaxy S26 Ultra is still required. This is not operational adoption. An icon already on the home screen will not show this artwork until that installed app is removed and added again from a deployment that serves this manifest.
