# Klang Valley Tycoon

A property-trading board game set in the Klang Valley, from Kajang satay to the Petronas Towers. Buy places, build houses and condos, and get rich, without one unlucky roll knocking you out of the game.

**Play now:** https://liansheng06-boom.github.io/klang-valley-tycoon/ (or open `index.html` in a browser).

## How it plays

- 2–4 players on one screen (pass-and-play), with bots filling the empty seats.
- Roll the 3D dice, buy the places you land on, collect full colour sets and build houses, then condos.
- Point at a tile to see its card. On a phone, tap it.
- Trade on your turn: Trades → Create, pick a player, tap places and set cash on each side. Bots answer straight away; friends get an Accept / Decline pop-up.
- Online rooms have a chat. Anyone who joins late sees the recent messages.
- Highest net worth after 20 rounds wins.

## House rules that stop the bankruptcy spiral

| Rule | What it does |
|---|---|
| Flatter rent curve | A condo charges 35× the site rent instead of 75× |
| Rising salary | Passing Mula pays RM200 + RM10 per house + RM40 per condo on the board |
| Rent cap | No single rent can take more than 40% of the payer's net worth |
| Bank loans | If you can't pay, the bank lends the difference at 10% a lap instead of you going bankrupt |
| Tabung | Taxes and fines go into a pool paid to the poorest player each round |
| 20 rounds | The richest net worth wins, so games stay around 40 minutes |

Every rule can be switched off under ☰ → New game. The Balance lab (☰ menu) plays hundreds of bot games under classic and house rules so you can compare them.

## Online rooms

`server.js` is a small Node server that serves the game and keeps online rooms in sync over a WebSocket. Press **Play online**, create a room and send friends the invite link. They don't need an account.

- **Host it on Render:** create a Blueprint from this repo. Render reads `render.yaml` and uses the free plan.
- **Run it yourself:** `npm install`, then `npm start`, then open http://localhost:5177.

Rooms are kept in memory. If the server restarts, or a free host puts it to sleep, the players' browsers send the game back when they reconnect, so a game in progress carries on. The GitHub Pages copy has no server, so it is pass-and-play with bots only.

## About

Place names are real Klang Valley places; prices, rents and cards are made up for play. This is a fan project with no connection to any company or brand.
