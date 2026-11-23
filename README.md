# The World in One Day — Sunday 22 November 2026

[![make.fun · news-image-20261122](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![rank](https://make.fun/badge/news-image-20261122/Nestaa404/news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![reward](https://make.fun/badge/news-image-20261122/Nestaa404/news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)

Entry for make.fun bounty: [Sum up 22 November's world news in one image](https://make.fun/c/news-image-20261122).

A one-page newspaper front page (1024×1024) summing up the world's news of
**Sunday 22 November 2026**, drawn entirely by `main.ts` — masthead,
headlines, illustrations and icons are all rendered in code. No network, no
clock, no randomness: two runs write byte-identical PNGs.

## What it covers

- **Lead story — COP31 collapses:** UN climate talks in Antalya ended on
  Sunday with no agreement of any kind after two days of overtime — the
  longest summit in history and the first total failure since Copenhagen in
  2009. The EU, Britain, Panama, the Marshall Islands, Norway and others
  rejected the draft "Antalya Pact" because it said nothing about fossil
  fuels, while Saudi Arabia and Russia blocked any fossil-fuel language.
  Ireland's Darragh O'Brien, speaking for the EU, called it
  "unconscionable". COP31 president Murat Kurum announced there was no
  deal; the United States sent no delegation at all.
- **The Gulf:** Iran's Revolutionary Guard fired missiles and drones at US
  positions in Bahrain on Saturday night, hitting the Al-Riffa and Awali
  bases and claiming to have struck two American Patriot radars. Bahrain
  said a civilian site on Sitra island was hit and caught fire; two people
  were hurt, one critically. Two tankers were also hit in the Strait of
  Hormuz; on Sunday Iran said two tankers were ablaze after striking
  mines. Tehran is readying 14 tankers at Kharg to run the US blockade,
  now on day 130. President Trump warned Iranian ships defying it would
  end up "on the seabed". (The Kharg detail is in the page's "DAY 130"
  header; the body text on the page itself is shorter.)
- **Benghazi:** a suspected Ukrainian sea drone struck the Russian corvette
  Merkury in Benghazi harbour before dawn on Sunday. The ship capsized
  and mostly sank, with only the bow above water; ten people were hurt.
  A Ukrainian drone had hit the cargo ship Sparta II a day earlier.
- **Cikande:** a fire at a candy factory in Cikande, Banten, on Saturday
  evening left three people confirmed dead by Sunday, with 36 to 50
  workers missing. Twenty-four body bags were recovered before the search
  was halted on Sunday night because the building was unsafe.
- **Washington:** the FBI is investigating a suspected hack of NCIC,
  America's national crime database, first reported on Friday and
  confirmed over the weekend. The FBI declined to comment; it is not yet
  known whether data was read, stolen or changed, or who was behind it.
- **Sport:** Carlos Alcaraz won his first ATP Finals title in Turin,
  beating world No. 1 Alexander Zverev 6–2, 7–6(9–7) — a 14th straight
  win, worth $5.17m. Jeeno Thitikul won a third straight LPGA title with
  a closing 65, and Liverpool beat ten-man Manchester United.
- **Also today:** Mexico confirmed 4 soldiers and 7 gunmen were killed in
  the arrest of "El Chapo Isidro" (11 dead in all); Mr Trump said he
  would work with Democrats on a 10% credit-card cap and reshared a
  "TrumpCare" health plan; residents searched for the missing after a
  Russian strike brought down a residential building in the Kyiv region;
  the EU and Indonesia signed a trade deal after almost 10 years of
  talks, with tariffs going on up to 98.5% of lines; children in Gaza
  face a critical insulin shortage and soaring prices; the Board of Peace
  criticised Mr Netanyahu for delaying the plan to disarm Hamas; ASEAN
  and China remain deadlocked over a code of conduct for the South China
  Sea; political uncertainty hangs over Spain ahead of the election on 29
  November; China–Japan ties worsen over Taiwan and critical minerals;
  the US Agriculture Department shut several applications after a
  security incident unrelated to the NCIC hack; FIFA is set to confirm
  England as host of the 2035 Women's World Cup; Greta Thunberg joined a
  protest at COP31.

## How to run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22, standard library only. The program reads `font.json` (bitmap glyphs
rendered from DejaVu Sans — regenerate them with `python3 tools/make_font.py`)
and writes `entry.png` into `$MAKEFUN_OUTPUT_DIR` (default `/output`).

## Determinism

The image contains no timestamps, no random values and no network access, so
two runs produce byte-identical output. Verified locally: two runs into
separate directories produced the same SHA-256.

## Files

- `main.ts` — the entry program: raster sheet, bitmap-font renderer, PNG
  encoder (zlib + CRC32, written from scratch), page layout and scenes.
- `font.json` — glyph bitmaps generated by `tools/make_font.py`.
- `tools/make_font.py` — renders DejaVu Sans glyphs with PIL into `font.json`.
- `LICENSE` — MIT.

## License

MIT — see [LICENSE](LICENSE).
