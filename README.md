# Klang Valley Tycoon

A property-trading board game set in the Klang Valley, from Kajang satay to the Petronas Towers. Buy places, build houses and condos, and get rich, without one unlucky roll knocking you out of the game.

Everything is played online through the game server (`server.js`). See **Online rooms** below to host it.

## How it plays

- The home page has **Play** (jump into an open public room, or open one), **All rooms** (browse public rooms by rules), and **Create a private game**.
- 2–6 players in an online room. A new room starts with every other seat empty; the host picks **Friends only** or **Fill with bots**, or sets each seat to empty, bot or closed, so you can also play alone against bots. Tap your token to change it; no two players share one.
- Roll the 3D dice, buy the places you land on, collect full colour sets and build houses, then condos.
- Skip a place and it goes to **auction**: everyone bids in turn, and passing drops you out. Online, a bidder who walks away is passed after 20 seconds.
- **Mortgage** a place for half its price (no rent until you pay it back plus 10%), and sell houses back at half price. Open a place's card on your turn to find these buttons.
- Point at a tile to see its card. On a phone, tap it.
- Trade on your turn: Trades → Create, pick a player, tap places and set cash on each side. Bots answer straight away; friends get an Accept / Decline pop-up.
- Online rooms have a chat. Anyone who joins late sees the recent messages.
- Give up from the ☰ menu on your turn; your places go back to the bank.
- Highest net worth after 20 rounds wins.

## Game rules

The host sets these in the room before the game starts:

| Rule | Default |
|---|---|
| Double rent on full colour sets | On |
| Auctions | On |
| Mortgages | On |
| Even building | On |
| No rent while the owner is stuck in the jam | Off |
| Mamak Break pot: taxes and fines pile up for whoever lands on Mamak Break | Off |
| Random turn order | Off |
| Starting cash | RM1,500 (RM500 to RM3,000) |

## House rules that stop the bankruptcy spiral

| Rule | What it does |
|---|---|
| Flatter rent curve | A condo charges 35× the site rent instead of 75× |
| Rising salary | Passing Mula pays RM200 + RM10 per house + RM40 per condo on the board |
| Rent cap | No single rent can take more than 40% of the payer's net worth |
| Bank loans | If you can't pay, the bank lends the difference at 10% a lap instead of you going bankrupt |
| Tabung | Taxes and fines go into a pool paid to the poorest player each round |
| 20 rounds | The richest net worth wins, so games stay around 40 minutes |

The host can switch every rule off in the room. The Balance lab (☰ menu) plays hundreds of bot games under classic and house rules so you can compare them.

## Online rooms

`server.js` is a small Node server that serves the game and keeps online rooms in sync over a WebSocket. Press **Play** or **Create a private game** and send friends the invite link. They don't need an account.

- **Host it on Render:** create a Blueprint from this repo. Render reads `render.yaml` and uses the free plan.
- **Run it yourself:** `npm install`, then `npm start`, then open http://localhost:5177.

Rooms are kept in memory. If the server restarts, or a free host puts it to sleep, the players' browsers send the game back when they reconnect, so a game in progress carries on. The GitHub Pages copy has no game server, so nothing can be played there; use the server's address instead.

## About

Place names are real Klang Valley places; prices, rents and cards are made up for play. This is a fan project with no connection to any company or brand.
