# WebSocket server

The server listens on port 31462 by default.

## Types

### `Score`

A scoreboard entry for a player.

* `username` (string) - The player's username.
* `score` (int) - The number of rounds a player has won.
* `didWin` (boolean) - Whether the player won the last round.
* `order` (int) - The player's position in the room, 0 is the player on the left in a 1v1.

## Events

Events take the form of a JSON object with the following fields:

* `type` (string) - The type of event.
* `client` (int?) - The client the event is referring to ("a" through "d").
* `data` (any?) - Optional data for the event, see each type for details.

### `game:start`

Fired when a round is starting. This happens during the prestart countdown at the start of a set, or as the score screen
is disappearing mid-set.

* `data`
  * `newGame` (boolean) - Whether this is the start of a set, or the start of a round in a set.

### `game:end`

Fired when a match ends.

* `data`
  * `reason` (string) - One of `finish` or `abort`.

### `game:score`

Fired when the score updates.

* `data`
  * `ft` (int) - The first to setting for the match.
  * `wb` (int) - The win by setting for the match.
  * `scores` (Score[]) - The current scores for the match.

### `game:round-end`

Fired when the last player has topped out in a round.

* `data`
  * `scores` (Score[]) - The current scores for the match.

### `multistream:layout`

Fired when the client layout changes.

* `data`
  * `layout` (string) - The new layout. One of `1x1`, `2x1`, `1x2`, `2x2`, `1L-2R`, `2L-1R`, `1T-2B`, `2T-1B`.

### `room:join`

Fired when a client joins a room.

* `data`
  * `id` (string) - The room code the client joined.

### `room:leave`

Fired when a client leaves a room.

## Commands

MultiStream can be controlled by sending a JSON object with the following fields:

* `type` (string) - The type of command.
* `client` (int?) - The client the command is referring to.
* `data` (any?) - Optional data for the command, see each type for details.

### `client:focus-player`

While in-game, spectate a particular player. Equivalent to `/focus [playername]` in chat.

* `data` (string) - The **username** of the player to focus.

### `room:join`

Join a room with a code.

* `data` (string) - The room code to join.