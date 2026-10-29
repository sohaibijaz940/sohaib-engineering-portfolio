# Word Search Studio

Browser modernization of https://github.com/sohaibijaz940/wordsearchgame at commit 226a5e37a0790516fa6de14d99f7e2ec092fd259. Original C++ and board/dictionary text files are retained in originals/. No changes were pushed to GitHub.

Run the portfolio with `npm install`, then `npm run dev -- --port 3001`. Open http://localhost:3001/demos/word-search/. No API keys or backend are required for this game.

The original has fixed 15×15 boards, horizontal/reverse matching on Easy, vertical matching on Intermediate and diagonals on Hard, three lives, ten points per word and file-based top-five scores. Its pause function does not save a session to disk. The browser edition implements real automatic resume in localStorage with validation; local records are personal and editable by the browser owner, not trusted competitive rankings.

Modernization: deterministic seeded generation, original-board play, daily UTC seed, relaxed mode, pointer/touch selection, keyboard navigation, hints marking runs assisted, optional audio, reduced-motion styles and search trace. Daily seeds are stable for this version, with no online leaderboard. Progress is saved on the current browser/origin only. Private browsing or storage restrictions may prevent persistence. Original boards exclude dictionary entries absent in permitted directions rather than setting an impossible completion target.

Keyboard: Tab onto the board, arrows move, Enter/Space marks a start, arrows select an endpoint, Enter/Space submits, Escape cancels. Drag straight lines with touch/mouse. Algorithm mode pauses active play time; its slider examines starting positions and permitted directions until a complete match. Complexity O(rows × columns × directions × word length).

Validation: `npm run typecheck`; `npm run test:word-search`; `npm run build`. Test generation over 300 seed/difficulty combinations, original-board solvability, reversed selections, difficulty constraints and deterministic daily seeds.
